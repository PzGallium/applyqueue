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
