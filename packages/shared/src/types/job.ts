export type JobSource = 'greenhouse' | 'lever' | 'ashby' | 'rss' | 'manual';
export type LocationType = 'remote' | 'hybrid' | 'onsite';
export type JobLevel = 'entry' | 'mid' | 'senior' | 'staff';

export interface JobSalary {
  min: number | null;
  max: number | null;
  currency: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  locationType: LocationType;
  url: string;
  source: JobSource;
  sourceId: string;
  dedupeHash: string;
  salary: JobSalary;
  tags: string[];
  level: JobLevel;
  postedAt: string;
  scrapedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  rawDescription: string;
}

export interface ScoreBreakdown {
  roleMatch: number;
  locationMatch: number;
  companyRating: number;
  salaryMatch: number;
  recency: number;
}

export interface RankedJob {
  jobId: string;
  rank: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  addedAt: string;
}

export interface RankedList {
  userId: string;
  rankings: RankedJob[];
  generatedAt: string;
  totalJobs: number;
  filters: {
    targetRoles: string[];
    targetLocations: string[];
    level: JobLevel[];
  };
}

export type JobSourceType = 'greenhouse' | 'lever' | 'ashby' | 'rss' | 'custom';

export interface JobSourceConfig {
  id: string;
  name: string;
  type: JobSourceType;
  config: {
    baseUrl: string;
    filters: Record<string, string>;
    schedule: string;
  };
  isEnabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: 'success' | 'error' | null;
  jobCount: number;
  createdAt: string;
  updatedAt: string;
}
