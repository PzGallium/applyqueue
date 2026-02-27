/**
 * Apply MVP — upload PDF to Cloud Storage and return signed download URL.
 * Path: resumes/{userId}/{applyId}.pdf
 */
export interface ArtifactResult {
    path: string;
    downloadUrl: string;
    expiresAt: string;
}
/**
 * Upload PDF buffer to resumes/{userId}/{applyId}.pdf and return signed URL.
 */
export declare function uploadResumePdf(userId: string, applyId: string, buffer: Buffer): Promise<ArtifactResult>;
/**
 * Get a new signed download URL for an existing resume PDF (e.g. for idempotent replay).
 * Path must already exist: resumes/{userId}/{applyId}.pdf
 */
export declare function getResumeDownloadUrl(userId: string, applyId: string): Promise<ArtifactResult>;
