/**
 * Apply MVP — upload PDF to Cloud Storage and return signed download URL.
 * Path: resumes/{userId}/{applyId}.pdf
 */

import { getStorage } from 'firebase-admin/storage';

const SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export interface ArtifactResult {
  path: string;
  downloadUrl: string;
  expiresAt: string;
}

/**
 * Upload PDF buffer to resumes/{userId}/{applyId}.pdf and return signed URL.
 */
export async function uploadResumePdf(
  userId: string,
  applyId: string,
  buffer: Buffer,
): Promise<ArtifactResult> {
  const path = `resumes/${userId}/${applyId}.pdf`;
  const bucket = getStorage().bucket();
  const file = bucket.file(path);

  await file.save(buffer, {
    resumable: false,
    contentType: 'application/pdf',
    metadata: { contentType: 'application/pdf' },
  });

  const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_MS);
  const [downloadUrl] = await file.getSignedUrl({
    action: 'read',
    expires: expiresAt,
  });

  return {
    path,
    downloadUrl,
    expiresAt: expiresAt.toISOString(),
  };
}
