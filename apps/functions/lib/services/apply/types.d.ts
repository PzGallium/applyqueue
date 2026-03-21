/**
 * Apply MVP — internal types and error codes.
 */
import { z } from 'zod';
export type ApplyMvpStatus = 'queued' | 'jd_ready' | 'generated' | 'exported' | 'done' | 'failed';
export declare const APPLY_ERROR_CODES: {
    readonly INVALID_INPUT: "INVALID_INPUT";
    readonly RANKED_LIST_NOT_FOUND: "RANKED_LIST_NOT_FOUND";
    readonly RANK_INDEX_OUT_OF_RANGE: "RANK_INDEX_OUT_OF_RANGE";
    readonly JD_NOT_AVAILABLE: "JD_NOT_AVAILABLE";
    readonly PROFILE_NOT_FOUND: "PROFILE_NOT_FOUND";
    readonly CREDENTIAL_NOT_CONFIGURED: "CREDENTIAL_NOT_CONFIGURED";
    readonly LLM_GENERATION_FAILED: "LLM_GENERATION_FAILED";
    readonly PDF_EXPORT_FAILED: "PDF_EXPORT_FAILED";
    readonly STORAGE_UPLOAD_FAILED: "STORAGE_UPLOAD_FAILED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly APPLICATION_IN_PROGRESS: "APPLICATION_IN_PROGRESS";
};
export type ApplyErrorCode = (typeof APPLY_ERROR_CODES)[keyof typeof APPLY_ERROR_CODES];
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
export declare const resumeContentSchema: z.ZodObject<{
    headline: z.ZodString;
    /** 产品废弃；生成后会被覆盖为空串 */
    summary: z.ZodString;
    experience: z.ZodArray<z.ZodObject<{
        company: z.ZodString;
        title: z.ZodString;
        date: z.ZodString;
        bullets: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        company: string;
        date: string;
        bullets: string[];
    }, {
        title: string;
        company: string;
        date: string;
        bullets: string[];
    }>, "many">;
    education: z.ZodArray<z.ZodObject<{
        school: z.ZodString;
        degree: z.ZodString;
        major: z.ZodString;
        date: z.ZodString;
        gpa: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        date: string;
        school: string;
        degree: string;
        major: string;
        gpa: string | null;
    }, {
        date: string;
        school: string;
        degree: string;
        major: string;
        gpa: string | null;
    }>, "many">;
    skills: z.ZodArray<z.ZodString, "many">;
    projects: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        url: z.ZodNullable<z.ZodString>;
        highlights: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        url: string | null;
        highlights: string[];
    }, {
        name: string;
        description: string;
        url: string | null;
        highlights: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    headline: string;
    summary: string;
    experience: {
        title: string;
        company: string;
        date: string;
        bullets: string[];
    }[];
    education: {
        date: string;
        school: string;
        degree: string;
        major: string;
        gpa: string | null;
    }[];
    skills: string[];
    projects: {
        name: string;
        description: string;
        url: string | null;
        highlights: string[];
    }[];
}, {
    headline: string;
    summary: string;
    experience: {
        title: string;
        company: string;
        date: string;
        bullets: string[];
    }[];
    education: {
        date: string;
        school: string;
        degree: string;
        major: string;
        gpa: string | null;
    }[];
    skills: string[];
    projects: {
        name: string;
        description: string;
        url: string | null;
        highlights: string[];
    }[];
}>;
export type ResumeContent = z.infer<typeof resumeContentSchema>;
