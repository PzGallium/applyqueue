"use strict";
/**
 * Apply N MVP — POST /api/apply
 *
 * Sync flow: rankIndex → resolve job → get JD from DB → profile → LLM Resume JSON
 * → HTML → PDF → upload to Storage → signed URL. All steps write application status.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@applyqueue/shared");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const llm_1 = require("../utils/llm");
const credentialResolver_1 = require("../services/keys/credentialResolver");
const crypto_1 = require("../services/keys/crypto");
const resume_generator_1 = require("../services/apply/resume-generator");
const pdf_exporter_1 = require("../services/apply/pdf-exporter");
const artifact_store_1 = require("../services/apply/artifact-store");
const types_1 = require("../services/apply/types");
const db = (0, firestore_1.getFirestore)();
const MVP_LLM_PROVIDER = 'gemini';
const MIN_JD_LENGTH = 50;
async function updateApplicationStatus(applyId, status, extra = {}) {
    const ref = db.collection('applications').doc(applyId);
    await ref.update({
        status,
        updatedAt: new Date().toISOString(),
        ...extra,
    });
}
exports.applyApi = (0, https_1.onRequest)({ timeoutSeconds: 300 }, async (req, res) => {
    if (req.method !== 'POST') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.applyMvpRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, types_1.APPLY_ERROR_CODES.INVALID_INPUT, parsed.error.message);
        return;
    }
    const { rankIndex } = parsed.data;
    let applyId;
    let jobId;
    let job;
    try {
        const rankDoc = await db.doc(`ranked_lists/${user.uid}`).get();
        if (!rankDoc.exists) {
            (0, response_1.error)(res, 404, types_1.APPLY_ERROR_CODES.RANKED_LIST_NOT_FOUND, 'Ranked list not found');
            return;
        }
        const list = rankDoc.data();
        const rankings = (list.rankings ?? []);
        const target = rankings.find((r) => r.rank === rankIndex);
        if (!target) {
            (0, response_1.error)(res, 404, types_1.APPLY_ERROR_CODES.RANK_INDEX_OUT_OF_RANGE, `No job at rank ${rankIndex}`);
            return;
        }
        jobId = target.jobId;
        const jobDoc = await db.doc(`jobs/${jobId}`).get();
        if (!jobDoc.exists) {
            (0, response_1.error)(res, 404, types_1.APPLY_ERROR_CODES.RANK_INDEX_OUT_OF_RANGE, 'Job no longer exists');
            return;
        }
        const jobData = jobDoc.data();
        job = {
            id: jobData.id,
            title: jobData.title,
            company: jobData.company,
            url: jobData.url,
            rawDescription: jobData.rawDescription,
        };
        const jdText = (job.rawDescription ?? '').trim();
        if (jdText.length < MIN_JD_LENGTH) {
            (0, response_1.error)(res, 400, types_1.APPLY_ERROR_CODES.JD_NOT_AVAILABLE, 'Job description not available or too short');
            return;
        }
        const userDoc = await db.doc(`users/${user.uid}`).get();
        if (!userDoc.exists) {
            (0, response_1.error)(res, 404, types_1.APPLY_ERROR_CODES.PROFILE_NOT_FOUND, 'User profile not found');
            return;
        }
        const profile = userDoc.data()?.profile;
        if (!profile?.headline || !profile.summary) {
            (0, response_1.error)(res, 404, types_1.APPLY_ERROR_CODES.PROFILE_NOT_FOUND, 'User profile missing or incomplete');
            return;
        }
        const appRef = db.collection('applications').doc();
        const applicationId = appRef.id;
        applyId = applicationId;
        await appRef.set({
            userId: user.uid,
            rankIndex,
            jobId,
            status: 'queued',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await updateApplicationStatus(applicationId, 'jd_ready');
        let apiKey = await (0, credentialResolver_1.resolveCredential)(user.uid, MVP_LLM_PROVIDER);
        if (!apiKey) {
            const keyDoc = await db.doc(`user_keys/${user.uid}`).get();
            if (keyDoc.exists) {
                apiKey = (0, crypto_1.decryptUserKey)(keyDoc.data(), MVP_LLM_PROVIDER);
            }
        }
        if (!apiKey) {
            await updateApplicationStatus(applicationId, 'failed', {
                errorCode: types_1.APPLY_ERROR_CODES.INTERNAL_ERROR,
                errorMessage: 'Configure LLM API key for Gemini first',
            });
            (0, response_1.error)(res, 400, types_1.APPLY_ERROR_CODES.INTERNAL_ERROR, 'Configure LLM API key for Gemini first');
            return;
        }
        const llm = (0, llm_1.getLlmClient)(MVP_LLM_PROVIDER, apiKey);
        let resumeContent;
        try {
            resumeContent = await (0, resume_generator_1.generateResumeContent)(llm, profile, jdText);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await updateApplicationStatus(applicationId, 'failed', {
                errorCode: types_1.APPLY_ERROR_CODES.LLM_GENERATION_FAILED,
                errorMessage: msg,
            });
            (0, response_1.error)(res, 502, types_1.APPLY_ERROR_CODES.LLM_GENERATION_FAILED, msg);
            return;
        }
        await updateApplicationStatus(applicationId, 'generated');
        const displayName = userDoc.data()?.displayName ?? 'Resume';
        const filename = (0, pdf_exporter_1.buildPdfFilename)(displayName, job.company, job.title);
        let buffer;
        try {
            const result = await (0, pdf_exporter_1.exportResumeToPdf)(resumeContent, filename);
            buffer = result.buffer;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await updateApplicationStatus(applicationId, 'failed', {
                errorCode: types_1.APPLY_ERROR_CODES.PDF_EXPORT_FAILED,
                errorMessage: msg,
            });
            (0, response_1.error)(res, 500, types_1.APPLY_ERROR_CODES.PDF_EXPORT_FAILED, msg);
            return;
        }
        await updateApplicationStatus(applicationId, 'exported');
        let artifact;
        try {
            artifact = await (0, artifact_store_1.uploadResumePdf)(user.uid, applicationId, buffer);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await updateApplicationStatus(applicationId, 'failed', {
                errorCode: types_1.APPLY_ERROR_CODES.STORAGE_UPLOAD_FAILED,
                errorMessage: msg,
            });
            (0, response_1.error)(res, 500, types_1.APPLY_ERROR_CODES.STORAGE_UPLOAD_FAILED, msg);
            return;
        }
        await updateApplicationStatus(applicationId, 'done', {
            'artifact.path': artifact.path,
        });
        const body = {
            applyId: applicationId,
            job: {
                id: job.id,
                title: job.title,
                company: job.company,
                sourceUrl: job.url ?? null,
            },
            status: 'done',
            artifact: {
                format: 'pdf',
                path: artifact.path,
                downloadUrl: artifact.downloadUrl,
                expiresAt: artifact.expiresAt,
            },
        };
        (0, response_1.success)(res, 200, body);
    }
    catch (err) {
        const code = err instanceof Error ? err.message : String(err);
        if (typeof applyId === 'string') {
            await updateApplicationStatus(applyId, 'failed', {
                errorCode: types_1.APPLY_ERROR_CODES.INTERNAL_ERROR,
                errorMessage: code,
            });
        }
        (0, response_1.error)(res, 500, types_1.APPLY_ERROR_CODES.INTERNAL_ERROR, code);
    }
});
//# sourceMappingURL=apply.fn.js.map