import { z } from 'zod';

export const profileSchema = z.object({
  headline: z.string().max(200),
  summary: z.string().max(2000),
  location: z.string().max(200),
  education: z.array(
    z.object({
      school: z.string().max(200),
      degree: z.string().max(100),
      major: z.string().max(100),
      gpa: z.number().min(0).max(4.0).nullable(),
      startDate: z.string(),
      endDate: z.string(),
    }),
  ),
  experience: z.array(
    z.object({
      company: z.string().max(200),
      title: z.string().max(200),
      description: z.string().max(2000),
      startDate: z.string(),
      endDate: z.string().nullable(),
      highlights: z.array(z.string().max(500)),
    }),
  ),
  skills: z.array(z.string().max(50)),
  projects: z.array(
    z.object({
      name: z.string().max(200),
      description: z.string().max(2000),
      url: z.string().url().nullable(),
      highlights: z.array(z.string().max(500)),
    }),
  ),
  links: z.object({
    github: z.string().url().nullable(),
    linkedin: z.string().url().nullable(),
    portfolio: z.string().url().nullable(),
    other: z.array(z.string().url()),
  }),
});

export const preferencesSchema = z.object({
  targetRoles: z.array(z.string().max(100)).min(1),
  targetLocations: z.array(z.string().max(200)),
  minSalary: z.number().min(0).nullable(),
  companySize: z.array(z.enum(['startup', 'mid', 'large'])),
  industries: z.array(z.string().max(100)),
  excludeCompanies: z.array(z.string().max(200)),
  autoRankWeights: z.object({
    roleMatch: z.number().min(0),
    locationMatch: z.number().min(0),
    companyRating: z.number().min(0),
    salaryMatch: z.number().min(0),
    recency: z.number().min(0),
  }),
});

export const applyRequestSchema = z.object({
  rank: z.number().int().min(1),
  options: z.object({
    exportFormats: z.array(z.enum(['pdf', 'docx'])).min(1),
    templateId: z.string().default('default'),
    llmProvider: z.string(),
    llmModel: z.string().optional(),
  }),
});

/** MVP: POST /api/apply body — rankIndex only (1-based). Optional idempotencyKey for dedup. */
export const applyMvpRequestSchema = z.object({
  rankIndex: z.number().int().min(1),
  idempotencyKey: z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Key Management schemas
// ---------------------------------------------------------------------------

const providerEnum = z.enum(['gemini', 'openai', 'anthropic', 'brave']);

export const keyUpdateSchema = z.object({
  provider: providerEnum,
  apiKey: z.string().min(10).max(500),
});

export const oauthCallbackSchema = z.object({
  provider: providerEnum,
  code: z.string().min(1),
  state: z.string().min(1),
  redirectUri: z.string().url(),
});

export const keyDeleteSchema = z.object({
  provider: providerEnum,
});

export const keyValidateSchema = z.object({
  provider: providerEnum,
  apiKey: z.string().min(10).max(500).optional(),
});

export const applicationUpdateSchema = z.object({
  status: z.enum(['saved', 'applied', 'oa', 'interview', 'offer', 'rejected']).optional(),
  note: z.string().max(2000).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

// ---------------------------------------------------------------------------
// Project Intelligence Layer schemas
// ---------------------------------------------------------------------------

const roleTagEnum = z.enum([
  'frontend', 'backend', 'fullstack', 'mobile', 'ml', 'data', 'devops', 'security', 'other',
]);

export const userProjectSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(3000),
  domainTags: z.array(z.string().max(50)),
  techTags: z.array(z.string().max(50)),
  roleTags: z.array(roleTagEnum).min(1),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  impactMetrics: z.record(z.unknown()).default({}),
  recencyScore: z.number().min(0).max(100).default(50),
  proofLinks: z.array(z.string().url()).default([]),
  rawBullets: z.array(z.string().max(500)).min(1),
});

export const jdParseRequestSchema = z.object({
  sourceUrl: z.string().url().optional(),
  rawText: z.string().min(50).max(20000),
  llmProvider: z.string().min(1),
  llmModel: z.string().optional(),
});

export const identityCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(30),
  headline: z.string().max(200).default(''),
  location: z.string().max(200).default(''),
  label: z.string().max(50).default(''),
});

export const identityUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().min(1).max(30).optional(),
  headline: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  label: z.string().max(50).optional(),
});

export const identityDeleteSchema = z.object({
  id: z.string().min(1),
});

export const identitySetDefaultSchema = z.object({
  id: z.string().min(1).nullable(),
});

export const resumeRefineRequestSchema = z
  .object({
    rawJdText: z.string().min(50).max(50000),
    /** 必选：精修简历标题与联系方式来自该身份 */
    identityId: z.string().min(1).max(100),
    /** 主档案 experience 数组的下标（可多选） */
    selectedExperienceIndices: z.array(z.number().int().min(0)).default([]),
    /** 项目池 projects/{id} 文档 id */
    selectedProjectIds: z.array(z.string().min(1).max(200)).default([]),
    selectedEducationIndices: z.array(z.number().int().min(0)).default([]),
    selectedSkillIndices: z.array(z.number().int().min(0)).default([]),
    llmProvider: z.string().min(1).default('gemini'),
    llmModel: z.string().max(100).optional(),
  })
  .refine(
    (d) => d.selectedExperienceIndices.length > 0 || d.selectedProjectIds.length > 0,
    {
      message: 'At least one experience entry or one project must be selected',
      path: ['selectedExperienceIndices'],
    },
  );

export const projectMatchRunSchema = z.object({
  jdProfileId: z.string().min(1),
  topK: z.number().int().min(1).max(10).default(3),
  llmProvider: z.string().min(1),
  llmModel: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Job Source Management schemas
// ---------------------------------------------------------------------------

export const jobSourceCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['greenhouse', 'lever', 'ashby', 'rss', 'custom']),
  config: z.object({
    baseUrl: z.string().min(1).max(500),
    filters: z.record(z.string()).default({}),
    schedule: z.string().default('0 9,21 * * *'),
  }),
});

export const jobSourceDeleteSchema = z.object({
  sourceId: z.string().min(1),
});
