import type {
  UserProject,
  JdProfile,
  ProjectMatchScoreBreakdown,
  ProjectScoreWeights,
} from '../types/project-intel';
import { DEFAULT_PROJECT_SCORE_WEIGHTS } from '../types/project-intel';

// ---------------------------------------------------------------------------
// Deterministic project-to-JD scoring engine (no LLM, pure keyword overlap)
// ---------------------------------------------------------------------------

function lowerset(arr: string[]): Set<string> {
  return new Set(arr.map((s) => s.toLowerCase().trim()).filter(Boolean));
}

/**
 * Jaccard-like overlap ratio between two sets, returned as 0-100.
 * |A ∩ B| / |B|  — measures how much of the *target* set is covered.
 */
function overlapScore(source: Set<string>, target: Set<string>): number {
  if (target.size === 0) return 0;
  let hits = 0;
  for (const t of target) {
    for (const s of source) {
      if (s === t || s.includes(t) || t.includes(s)) {
        hits++;
        break;
      }
    }
  }
  return Math.round((hits / target.size) * 100);
}

/** Score tech tag overlap against JD must-have + nice-to-have keywords. */
function scoreTechMatch(project: UserProject, jd: JdProfile): number {
  const projTech = lowerset(project.techTags);
  const jdKeywords = lowerset([...jd.mustHaveKeywords, ...jd.niceToHaveKeywords]);
  return overlapScore(projTech, jdKeywords);
}

/** Score role tag overlap. */
function scoreRoleMatch(project: UserProject, jd: JdProfile): number {
  const projRoles = lowerset(project.roleTags);
  const jdRole = lowerset([jd.roleType]);
  if (jdRole.size === 0) return 50;
  return projRoles.has([...jdRole][0]) ? 100 : 0;
}

/** Score domain tag overlap against JD parsed requirements. */
function scoreDomainMatch(project: UserProject, jd: JdProfile): number {
  const projDomains = lowerset(project.domainTags);
  const jdDomains = lowerset([
    ...jd.parsedRequirements.responsibilities,
    ...jd.parsedRequirements.qualifications,
  ]);
  if (jdDomains.size === 0) return 50;
  return overlapScore(projDomains, jdDomains);
}

/**
 * Score impact evidence.
 * Projects with any quantified metrics score higher.
 */
function scoreImpactEvidence(project: UserProject): number {
  const m = project.impactMetrics;
  const fields = Object.keys(m).filter((k) => m[k] !== undefined && m[k] !== null);
  if (fields.length === 0) return 10;
  if (fields.length === 1) return 40;
  if (fields.length === 2) return 65;
  if (fields.length === 3) return 85;
  return 100;
}

/** Recency uses the pre-computed recencyScore (0-100) on the project. */
function scoreRecency(project: UserProject): number {
  return Math.max(0, Math.min(100, project.recencyScore));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ProjectScoringResult {
  projectId: string;
  scoreTotal: number;
  scoreBreakdown: ProjectMatchScoreBreakdown;
}

/**
 * Score a single project against a JD profile.
 * All sub-scores are 0-100. Final score is a weighted sum normalized to 0-100.
 */
export function scoreProject(
  project: UserProject,
  jd: JdProfile,
  weights: ProjectScoreWeights = DEFAULT_PROJECT_SCORE_WEIGHTS,
): ProjectScoringResult {
  const breakdown: ProjectMatchScoreBreakdown = {
    techMatch: scoreTechMatch(project, jd),
    roleMatch: scoreRoleMatch(project, jd),
    domainMatch: scoreDomainMatch(project, jd),
    impactEvidence: scoreImpactEvidence(project),
    recency: scoreRecency(project),
  };

  const keys = Object.keys(weights) as (keyof ProjectScoreWeights)[];
  const wSum = keys.reduce((a, k) => a + weights[k], 0);
  const normalizedWeights = wSum === 0
    ? (Object.fromEntries(keys.map((k) => [k, 1 / keys.length])) as unknown as ProjectScoreWeights)
    : (Object.fromEntries(keys.map((k) => [k, weights[k] / wSum])) as unknown as ProjectScoreWeights);

  const scoreTotal = Math.round(
    keys.reduce((acc, k) => acc + breakdown[k] * normalizedWeights[k], 0),
  );

  return {
    projectId: project.id,
    scoreTotal: Math.max(0, Math.min(100, scoreTotal)),
    scoreBreakdown: breakdown,
  };
}

/**
 * Score all projects, sort descending, and select top K.
 * Returns the full ranked list — caller decides how many to take.
 */
export function rankProjects(
  projects: UserProject[],
  jd: JdProfile,
  weights?: ProjectScoreWeights,
): ProjectScoringResult[] {
  return projects
    .map((p) => scoreProject(p, jd, weights))
    .sort((a, b) => b.scoreTotal - a.scoreTotal);
}

/**
 * Build keyword strategy by comparing project tech tags against JD keywords.
 */
export function buildKeywordStrategy(
  selectedProjects: UserProject[],
  jd: JdProfile,
): { mustInclude: string[]; goodToInclude: string[]; currentlyMissing: string[] } {
  const projTech = lowerset(selectedProjects.flatMap((p) => p.techTags));

  const mustHave = lowerset(jd.mustHaveKeywords);
  const niceToHave = lowerset(jd.niceToHaveKeywords);

  const mustInclude: string[] = [];
  const currentlyMissing: string[] = [];
  for (const kw of mustHave) {
    let found = false;
    for (const pt of projTech) {
      if (pt === kw || pt.includes(kw) || kw.includes(pt)) { found = true; break; }
    }
    if (found) mustInclude.push(kw);
    else currentlyMissing.push(kw);
  }

  const goodToInclude: string[] = [];
  for (const kw of niceToHave) {
    let found = false;
    for (const pt of projTech) {
      if (pt === kw || pt.includes(kw) || kw.includes(pt)) { found = true; break; }
    }
    if (found) goodToInclude.push(kw);
    else currentlyMissing.push(kw);
  }

  return { mustInclude, goodToInclude, currentlyMissing };
}
