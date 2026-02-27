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

/**
 * Get a new signed download URL for an existing resume PDF (e.g. for idempotent replay).
 * Path must already exist: resumes/{userId}/{applyId}.pdf
 */
export async function getResumeDownloadUrl(
  userId: string,
  applyId: string,
): Promise<ArtifactResult> {
  const path = `resumes/${userId}/${applyId}.pdf`;
  const bucket = getStorage().bucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error('Resume file not found');
  }
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
