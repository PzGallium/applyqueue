import { getFirestore } from 'firebase-admin/firestore';
import type { Job, RankedJob, RankedList, UserPreferences } from '@applyqueue/shared';
import { calculateRankScore, DEFAULT_WEIGHTS, type ScoringInput } from '@applyqueue/shared';

const db = getFirestore();

function computeScoringInput(job: Job, prefs: UserPreferences): ScoringInput {
  const titleLower = job.title.toLowerCase();
  const targetRolesLower = prefs.targetRoles.map((r) => r.toLowerCase());
  const roleMatchScore = targetRolesLower.some((r) =>
    titleLower.includes(r) || r.split(' ').every((w) => titleLower.includes(w))
  )
    ? 90
    : 30;

  const locLower = job.location.toLowerCase();
  const targetLocsLower = prefs.targetLocations.map((l) => l.toLowerCase());
  const locationMatchScore = targetLocsLower.some((l) => locLower.includes(l))
    ? 90
    : job.locationType === 'remote'
      ? 70
      : 20;

  const companyRatingScore = 50;

  let salaryMatchScore = 50;
  if (prefs.minSalary && job.salary.max) {
    salaryMatchScore = job.salary.max >= prefs.minSalary ? 80 : 20;
  }

  const postedMs = new Date(job.postedAt).getTime();
  const daysSincePosted = (Date.now() - postedMs) / (1000 * 60 * 60 * 24);
  const recencyScore = daysSincePosted <= 3 ? 100 : daysSincePosted <= 7 ? 80 : daysSincePosted <= 14 ? 60 : daysSincePosted <= 30 ? 40 : 20;

  return {
    roleMatchScore,
    locationMatchScore,
    companyRatingScore,
    salaryMatchScore,
    recencyScore,
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

  const jobsSnap = await db.collection('jobs').where('isActive', '==', true).get();
  const jobs = jobsSnap.docs.map((d) => d.data() as Job);

  const excludeSet = new Set(prefs.excludeCompanies.map((c) => c.toLowerCase()));
  const filtered = jobs.filter((j) => !excludeSet.has(j.company.toLowerCase()));

  const scored = filtered.map((job) => {
    const input = computeScoringInput(job, prefs);
    const { score, breakdown } = calculateRankScore(input, weights);
    return { job, score, breakdown };
  });

  scored.sort((a, b) => b.score - a.score);

  const now = new Date().toISOString();
  const rankings: RankedJob[] = scored.map((s, i) => ({
    jobId: s.job.id,
    rank: i + 1,
    score: s.score,
    scoreBreakdown: s.breakdown,
    addedAt: now,
  }));

  const rankedList: RankedList = {
    userId,
    rankings,
    generatedAt: now,
    totalJobs: rankings.length,
    filters: {
      targetRoles: prefs.targetRoles,
      targetLocations: prefs.targetLocations,
      level: ['entry'],
    },
  };

  await db.doc(`ranked_lists/${userId}`).set(rankedList);
  return rankedList;
}
