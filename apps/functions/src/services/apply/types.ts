/**
 * Apply MVP — internal types and error codes.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Application status (Firestore applications/{applyId})
// ---------------------------------------------------------------------------

export type ApplyMvpStatus =
  | 'queued'
  | 'jd_ready'
  | 'generated'
  | 'exported'
  | 'done'
  | 'failed';

// ---------------------------------------------------------------------------
// Error codes (must match plan; frontend can enumerate)
// ---------------------------------------------------------------------------

export const APPLY_ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  RANKED_LIST_NOT_FOUND: 'RANKED_LIST_NOT_FOUND',
  RANK_INDEX_OUT_OF_RANGE: 'RANK_INDEX_OUT_OF_RANGE',
  JD_NOT_AVAILABLE: 'JD_NOT_AVAILABLE',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  CREDENTIAL_NOT_CONFIGURED: 'CREDENTIAL_NOT_CONFIGURED',
  LLM_GENERATION_FAILED: 'LLM_GENERATION_FAILED',
  PDF_EXPORT_FAILED: 'PDF_EXPORT_FAILED',
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  APPLICATION_IN_PROGRESS: 'APPLICATION_IN_PROGRESS',
} as const;

export type ApplyErrorCode = (typeof APPLY_ERROR_CODES)[keyof typeof APPLY_ERROR_CODES];

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface ApplyMvpSuccessResponse {
  applyId: string;
  job: {
    id: string;
    title: string;
    company: string;
    sourceUrl?: string | null;
  };
  status: 'done';
  artifact: {
    format: 'pdf';
    path: string;
    downloadUrl: string;
    expiresAt: string;
  };
}

// ---------------------------------------------------------------------------
// ResumeContent — Zod schema for LLM output validation
// (matches @applyqueue/shared ResumeContent)
// ---------------------------------------------------------------------------

const resumeExperienceItemSchema = z.object({
  company: z.string(),
  title: z.string(),
  date: z.string(),
  bullets: z.array(z.string()),
});

const resumeEducationItemSchema = z.object({
  school: z.string(),
  degree: z.string(),
  major: z.string(),
  date: z.string(),
  gpa: z.string().nullable(),
});

const resumeProjectItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string().url().nullable(),
  highlights: z.array(z.string()),
});

export const resumeContentSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  experience: z.array(resumeExperienceItemSchema),
  education: z.array(resumeEducationItemSchema),
  skills: z.array(z.string()),
  projects: z.array(resumeProjectItemSchema),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;
