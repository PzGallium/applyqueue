"use strict";
/**
 * Resume Refine API
 *
 * POST /api/resume/refine — generate a tailored resume from identity + pool selections + JD (strict_empty).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resumeRefineApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@applyqueue/shared");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const llm_1 = require("../utils/llm");
const credentialResolver_1 = require("../services/keys/credentialResolver");
const resume_generator_1 = require("../services/apply/resume-generator");
const refine_assembly_1 = require("../services/apply/refine-assembly");
const db = (0, firestore_1.getFirestore)();
const MIN_JD_LENGTH = 50;
exports.resumeRefineApi = (0, https_1.onRequest)({ timeoutSeconds: 120, memory: '512MiB' }, async (req, res) => {
    if (req.method !== 'POST') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.resumeRefineRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, 'INVALID_INPUT', parsed.error.message);
        return;
    }
    const { rawJdText, identityId, selectedExperienceIndices, selectedProjectIds, selectedEducationIndices, selectedSkillIndices, llmProvider, llmModel, } = parsed.data;
    const jdText = rawJdText.trim();
    if (jdText.length < MIN_JD_LENGTH) {
        (0, response_1.error)(res, 400, 'INVALID_INPUT', `JD text must be at least ${MIN_JD_LENGTH} characters`);
        return;
    }
    const userDoc = await db.doc(`users/${user.uid}`).get();
    if (!userDoc.exists) {
        (0, response_1.error)(res, 404, 'PROFILE_NOT_FOUND', 'User profile not found. Please complete your profile first.');
        return;
    }
    const profile = userDoc.data()?.profile;
    if (!profile) {
        (0, response_1.error)(res, 404, 'PROFILE_NOT_FOUND', 'User profile missing or incomplete');
        return;
    }
    const poolDoc = await db.doc(`identity_profiles/${user.uid}`).get();
    const pool = poolDoc.exists ? poolDoc.data() : null;
    const rawEntry = pool?.items?.find((e) => e.id === identityId);
    if (!rawEntry) {
        (0, response_1.error)(res, 400, 'INVALID_INPUT', 'Selected identity not found');
        return;
    }
    const identityNorm = (0, refine_assembly_1.normalizeIdentityEntry)(rawEntry);
    const selErr = (0, refine_assembly_1.validateSelectionAgainstProfile)(profile, {
        experienceIndices: selectedExperienceIndices,
        educationIndices: selectedEducationIndices,
        skillIndices: selectedSkillIndices,
    });
    if (selErr) {
        (0, response_1.error)(res, 400, 'INVALID_INPUT', selErr);
        return;
    }
    const uniqueProjectIds = [...new Set(selectedProjectIds)];
    const projectDocs = [];
    if (uniqueProjectIds.length > 0) {
        const refs = await Promise.all(uniqueProjectIds.map((id) => db.doc(`projects/${id}`).get()));
        for (let i = 0; i < refs.length; i++) {
            const doc = refs[i];
            if (!doc.exists) {
                (0, response_1.error)(res, 400, 'INVALID_INPUT', `Project not found: ${uniqueProjectIds[i]}`);
                return;
            }
            const p = doc.data();
            if (p.userId !== user.uid) {
                (0, response_1.error)(res, 403, 'FORBIDDEN', 'Not your project');
                return;
            }
            projectDocs.push(p);
        }
    }
    const assembled = (0, refine_assembly_1.buildRefineProfile)(profile, identityNorm, {
        experienceIndices: selectedExperienceIndices,
        educationIndices: selectedEducationIndices,
        skillIndices: selectedSkillIndices,
    }, projectDocs);
    const credential = await (0, credentialResolver_1.resolveCredential)(user.uid, llmProvider);
    if (!credential) {
        (0, response_1.error)(res, 400, 'CREDENTIAL_NOT_CONFIGURED', `No API key or OAuth for ${llmProvider}. Please connect in Settings.`);
        return;
    }
    try {
        const llm = (0, llm_1.getLlmClient)(llmProvider, credential, llmProvider === 'gemini' ? 'oauth' : 'api_key');
        const resumeContent = await (0, resume_generator_1.generateResumeContent)(llm, assembled, jdText, llmModel);
        resumeContent.headline = identityNorm.headline;
        resumeContent.summary = '';
        (0, response_1.success)(res, 200, {
            resumeContent: resumeContent,
            changes: [],
            identity: {
                name: identityNorm.name,
                email: identityNorm.email,
                phone: identityNorm.phone,
                headline: identityNorm.headline,
                location: identityNorm.location,
            },
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Resume generation failed';
        (0, response_1.error)(res, 500, 'GENERATION_FAILED', message);
    }
});
//# sourceMappingURL=resume-refine.fn.js.map