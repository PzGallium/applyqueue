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
    roleMatch: z.number().min(0).max(1),
    locationMatch: z.number().min(0).max(1),
    companyRating: z.number().min(0).max(1),
    salaryMatch: z.number().min(0).max(1),
    recency: z.number().min(0).max(1),
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

export const keyUpdateSchema = z.object({
  provider: z.string().min(1).max(50),
  apiKey: z.string().min(10).max(500),
});

export const applicationUpdateSchema = z.object({
  status: z.enum(['saved', 'applied', 'oa', 'interview', 'offer', 'rejected']).optional(),
  note: z.string().max(2000).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});
