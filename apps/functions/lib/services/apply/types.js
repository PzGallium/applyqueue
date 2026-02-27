"use strict";
/**
 * Apply MVP — internal types and error codes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeContentSchema = exports.APPLY_ERROR_CODES = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Error codes (must match plan; frontend can enumerate)
// ---------------------------------------------------------------------------
exports.APPLY_ERROR_CODES = {
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
};
// ---------------------------------------------------------------------------
// ResumeContent — Zod schema for LLM output validation
// (matches @applyqueue/shared ResumeContent)
// ---------------------------------------------------------------------------
const resumeExperienceItemSchema = zod_1.z.object({
    company: zod_1.z.string(),
    title: zod_1.z.string(),
    date: zod_1.z.string(),
    bullets: zod_1.z.array(zod_1.z.string()),
});
const resumeEducationItemSchema = zod_1.z.object({
    school: zod_1.z.string(),
    degree: zod_1.z.string(),
    major: zod_1.z.string(),
    date: zod_1.z.string(),
    gpa: zod_1.z.string().nullable(),
});
const resumeProjectItemSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    url: zod_1.z.string().url().nullable(),
    highlights: zod_1.z.array(zod_1.z.string()),
});
exports.resumeContentSchema = zod_1.z.object({
    headline: zod_1.z.string(),
    summary: zod_1.z.string(),
    experience: zod_1.z.array(resumeExperienceItemSchema),
    education: zod_1.z.array(resumeEducationItemSchema),
    skills: zod_1.z.array(zod_1.z.string()),
    projects: zod_1.z.array(resumeProjectItemSchema),
});
//# sourceMappingURL=types.js.map