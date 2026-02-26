import { getFirestore } from 'firebase-admin/firestore';
import type { Job, RankedJob, RankedList, UserPreferences } from '@applyqueue/shared';
import { calculateRankScore, DEFAULT_WEIGHTS, type ScoringInput } from '@applyqueue/shared';

const db = getFirestore();

/**
 * Role keyword matching with priority decay.
 * roleKeywords is ordered high→low priority.
 * First match gets 100, second 85, third 70, etc.
 * Falls back to targetRoles flat match.
 */
function scoreRole(job: Job, prefs: UserPreferences): number {
  const titleLower = job.title.toLowerCase();
  const descLower = job.rawDescription?.toLowerCase() ?? '';
  const text = `${titleLower} ${descLower}`;

  if (prefs.roleKeywords && prefs.roleKeywords.length > 0) {
    for (let i = 0; i < prefs.roleKeywords.length; i++) {
      const kw = prefs.roleKeywords[i].toLowerCase();
      const words = kw.split(/\s+/);
      if (words.every((w) => text.includes(w))) {
        return Math.max(30, 100 - i * 15);
      }
    }
    return 10;
  }

  const targetRolesLower = prefs.targetRoles.map((r) => r.toLowerCase());
  return targetRolesLower.some((r) =>
    titleLower.includes(r) || r.split(' ').every((w) => titleLower.includes(w))
  )
    ? 90
    : 30;
}

/**
 * Location matching with priority decay.
 * locationPriorities ordered high→low.
 * "Remote" always scores high.
 */
function scoreLocation(job: Job, prefs: UserPreferences): number {
  const locLower = job.location.toLowerCase();
  const isRemote = job.locationType === 'remote' || /\bremote\b/i.test(job.location);

  if (prefs.locationPriorities && prefs.locationPriorities.length > 0) {
    for (let i = 0; i < prefs.locationPriorities.length; i++) {
      const pref = prefs.locationPriorities[i].toLowerCase();
      if (pref === 'remote' && isRemote) return Math.max(30, 100 - i * 10);
      if (locLower.includes(pref)) return Math.max(30, 100 - i * 10);
    }
    return isRemote ? 60 : 15;
  }

  const targetLocsLower = prefs.targetLocations.map((l) => l.toLowerCase());
  return targetLocsLower.some((l) => locLower.includes(l))
    ? 90
    : isRemote
      ? 70
      : 20;
}

/**
 * Tech keyword matching.
 * Score based on how many techKeywords appear in JD.
 */
function scoreTech(job: Job, prefs: UserPreferences): number {
  if (!prefs.techKeywords || prefs.techKeywords.length === 0) return 50;

  const text = `${job.title} ${job.rawDescription ?? ''}`.toLowerCase();
  let hits = 0;
  for (const kw of prefs.techKeywords) {
    if (text.includes(kw.toLowerCase())) hits++;
  }
  const ratio = hits / prefs.techKeywords.length;
  return Math.round(ratio * 100);
}

/**
 * Big company bonus.
 * If job company is in user's priorityCompanies, add significant score boost.
 */
function scorePriorityCompany(job: Job, prefs: UserPreferences): number {
  if (!prefs.priorityCompanies || prefs.priorityCompanies.length === 0) return 50;
  const companyLower = job.company.toLowerCase();
  return prefs.priorityCompanies.some((c) => companyLower.includes(c.toLowerCase())) ? 100 : 40;
}

/**
 * Level matching.
 * Prefer new_grad/entry if specified.
 */
function scoreLevel(job: Job, prefs: UserPreferences): number {
  if (!prefs.targetLevels || prefs.targetLevels.length === 0) return 50;

  const titleLower = job.title.toLowerCase();
  const descLower = (job.rawDescription ?? '').toLowerCase();
  const text = `${titleLower} ${descLower}`;
  const jobLevel = job.level;

  for (const level of prefs.targetLevels) {
    const l = level.toLowerCase();
    if (l === 'new_grad' || l === 'new grad') {
      if (text.includes('new grad') || text.includes('new college') || text.includes('early career') || jobLevel === 'entry') return 95;
    }
    if (l === 'entry' && jobLevel === 'entry') return 90;
    if (l === 'intern' && text.includes('intern')) return 85;
  }

  return jobLevel === 'entry' ? 60 : 30;
}

function computeScoringInput(job: Job, prefs: UserPreferences): ScoringInput {
  return {
    roleMatchScore: scoreRole(job, prefs),
    locationMatchScore: scoreLocation(job, prefs),
    companyRatingScore: scorePriorityCompany(job, prefs),
    salaryMatchScore: prefs.minSalary && job.salary.max
      ? (job.salary.max >= prefs.minSalary ? 80 : 20)
      : 50,
    recencyScore: (() => {
      const days = (Date.now() - new Date(job.postedAt).getTime()) / 86400000;
      return days <= 3 ? 100 : days <= 7 ? 80 : days <= 14 ? 60 : days <= 30 ? 40 : 20;
    })(),
  };
}

export async function rankJobsForUser(userId: string): Promise<RankedList> {
  const userDoc = await db.doc(`users/${userId}`).get();
  const prefs: UserPreferences = userDoc.exists
    ? (userDoc.data()!.preferences as UserPreferences)
    : {
        targetRoles: [],
        targetLocations: [],
        minSalary: null,
        companySize: [],
        industries: [],
        excludeCompanies: [],
        autoRankWeights: DEFAULT_WEIGHTS,
      };

  const weights = prefs.autoRankWeights ?? DEFAULT_WEIGHTS;
  const batchSize = prefs.batchSize ?? 10;

  const jobsSnap = await db.collection('jobs').where('isActive', '==', true).get();
  const jobs = jobsSnap.docs.map((d) => d.data() as Job);

  const excludeSet = new Set(prefs.excludeCompanies.map((c) => c.toLowerCase()));
  const filtered = jobs.filter((j) => !excludeSet.has(j.company.toLowerCase()));

  const scored = filtered.map((job) => {
    const input = computeScoringInput(job, prefs);
    const { score, breakdown } = calculateRankScore(input, weights);

    let bonus = 0;
    if (prefs.techKeywords && prefs.techKeywords.length > 0) {
      bonus += scoreTech(job, prefs) * 0.1;
    }
    if (prefs.targetLevels && prefs.targetLevels.length > 0) {
      bonus += scoreLevel(job, prefs) * 0.05;
    }

    return { job, score: Math.min(100, score + bonus), breakdown };
  });

  scored.sort((a, b) => b.score - a.score);

  const now = new Date().toISOString();
  const rankings: RankedJob[] = scored.map((s, i) => ({
    jobId: s.job.id,
    rank: i + 1,
    score: Math.round(s.score),
    scoreBreakdown: s.breakdown,
    addedAt: now,
  }));

  const rankedList: RankedList = {
    userId,
    rankings,
    generatedAt: now,
    totalJobs: rankings.length,
    filters: {
      targetRoles: prefs.roleKeywords ?? prefs.targetRoles,
      targetLocations: prefs.locationPriorities ?? prefs.targetLocations,
      level: (prefs.targetLevels ?? ['entry']) as any,
    },
  };

  await db.doc(`ranked_lists/${userId}`).set(rankedList);
  return rankedList;
}
