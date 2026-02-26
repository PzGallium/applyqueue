"use strict";
/**
 * Apply MVP — upload PDF to Cloud Storage and return signed download URL.
 * Path: resumes/{userId}/{applyId}.pdf
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadResumePdf = uploadResumePdf;
const storage_1 = require("firebase-admin/storage");
const SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
/**
 * Upload PDF buffer to resumes/{userId}/{applyId}.pdf and return signed URL.
 */
async function uploadResumePdf(userId, applyId, buffer) {
    const path = `resumes/${userId}/${applyId}.pdf`;
    const bucket = (0, storage_1.getStorage)().bucket();
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
//# sourceMappingURL=artifact-store.js.map