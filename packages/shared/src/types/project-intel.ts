// ---------------------------------------------------------------------------
// Project Intelligence Layer — Data Model
// ---------------------------------------------------------------------------

export type RoleTag = 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'ml' | 'data' | 'devops' | 'security' | 'other';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/** Impact metrics attached to a project (all optional, user fills what applies). */
export interface ImpactMetrics {
  latencyMs?: number;
  qps?: number;
  users?: number;
  uptime?: number;
  costSaved?: number;
  dataScale?: string;
  [key: string]: unknown;
}

// ---- Firestore: projects/{projectId} ----

export interface UserProject {
  id: string;
  userId: string;
  title: string;
  summary: string;
  domainTags: string[];
  techTags: string[];
  roleTags: RoleTag[];
  difficultyLevel: DifficultyLevel;
  impactMetrics: ImpactMetrics;
  recencyScore: number;
  proofLinks: string[];
  rawBullets: string[];
  createdAt: string;
  updatedAt: string;
}

// ---- Firestore: jd_profiles/{jdProfileId} ----

export interface JdParsedRequirements {
  hardSkills: string[];
  softSkills: string[];
  responsibilities: string[];
  qualifications: string[];
}

export interface JdProfile {
  id: string;
  userId: string;
  sourceUrl: string | null;
  rawText: string;
  parsedRequirements: JdParsedRequirements;
  mustHaveKeywords: string[];
  niceToHaveKeywords: string[];
  seniority: string;
  roleType: RoleTag;
  createdAt: string;
}

// ---- Firestore: project_matches/{matchId} ----

export interface ProjectMatchScoreBreakdown {
  techMatch: number;
  roleMatch: number;
  domainMatch: number;
  impactEvidence: number;
  recency: number;
}

export interface ProjectMatch {
  id: string;
  userId: string;
  jdProfileId: string;
  projectId: string;
  scoreTotal: number;
  scoreBreakdown: ProjectMatchScoreBreakdown;
  selected: boolean;
  rank: number;
  generatedKeywords: string[];
  generatedBullets: string[];
  createdAt: string;
}

// ---- Keyword strategy returned by the matching endpoint ----

export interface KeywordStrategy {
  mustInclude: string[];
  goodToInclude: string[];
  currentlyMissing: string[];
}

export interface ProjectMatchResult {
  jdProfileId: string;
  selectedProjects: Array<{
    rank: number;
    project: UserProject;
    match: ProjectMatch;
  }>;
  keywordStrategy: KeywordStrategy;
  bulletSuggestions: Record<string, string[]>;
  explanation: string;
}

// ---- Scoring weights ----

export interface ProjectScoreWeights {
  techMatch: number;
  roleMatch: number;
  domainMatch: number;
  impactEvidence: number;
  recency: number;
}

export const DEFAULT_PROJECT_SCORE_WEIGHTS: ProjectScoreWeights = {
  techMatch: 0.40,
  roleMatch: 0.20,
  domainMatch: 0.15,
  impactEvidence: 0.15,
  recency: 0.10,
};
