"use strict";
/**
 * Apply N orchestration function.
 *
 * POST /api/apply — triggers the full pipeline:
 *   1. jd_fetch   → fetch raw JD from job URL
 *   2. jd_parse   → LLM-parse JD into structured profile
 *   3. project_match → Project Intelligence: score, select, rewrite bullets
 *   4. resume_generate → generate tailored resume
 *   5. export_pdf  → render PDF
 *   6. export_docx → render DOCX
 *
 * Progress is written to the application document in Firestore
 * so the frontend can subscribe via onSnapshot.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@applyqueue/shared");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const llm_1 = require("../utils/llm");
const crypto_1 = require("../services/keys/crypto");
const jdProfileService_1 = require("../services/project-intel/jdProfileService");
const projectMatchService_1 = require("../services/project-intel/projectMatchService");
const db = (0, firestore_1.getFirestore)();
async function updateStep(appDocRef, steps, stepName, status, extra) {
    const idx = steps.findIndex((s) => s.step === stepName);
    if (idx !== -1) {
        steps[idx] = { ...steps[idx], status, ...extra };
        await appDocRef.update({ steps, updatedAt: new Date().toISOString() });
    }
}
exports.applyApi = (0, https_1.onRequest)({ timeoutSeconds: 300 }, async (req, res) => {
    if (req.method !== 'POST') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.applyRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
        return;
    }
    const { rank, options } = parsed.data;
    // Resolve Nth ranked job
    const rankDoc = await db.doc(`ranked_lists/${user.uid}`).get();
    if (!rankDoc.exists) {
        (0, response_1.error)(res, 400, 'NO_RANKINGS', 'Generate rankings first');
        return;
    }
    const rankings = (rankDoc.data().rankings ?? []);
    const target = rankings.find((r) => r.rank === rank);
    if (!target) {
        (0, response_1.error)(res, 404, 'RANK_NOT_FOUND', `No job at rank ${rank}`);
        return;
    }
    const jobDoc = await db.doc(`jobs/${target.jobId}`).get();
    if (!jobDoc.exists) {
        (0, response_1.error)(res, 404, 'JOB_NOT_FOUND', 'Job no longer exists');
        return;
    }
    const job = jobDoc.data();
    // Decrypt LLM key
    const keyDoc = await db.doc(`user_keys/${user.uid}`).get();
    if (!keyDoc.exists) {
        (0, response_1.error)(res, 400, 'NO_API_KEY', 'Configure your LLM API key first');
        return;
    }
    const apiKey = (0, crypto_1.decryptUserKey)(keyDoc.data(), options.llmProvider);
    if (!apiKey) {
        (0, response_1.error)(res, 400, 'MISSING_PROVIDER_KEY', `No key for provider: ${options.llmProvider}`);
        return;
    }
    const llm = (0, llm_1.getLlmClient)(options.llmProvider, apiKey);
    // Create application document with steps
    const appRef = db.collection('applications').doc();
    const steps = [
        { step: 'jd_fetch', status: 'pending' },
        { step: 'jd_parse', status: 'pending' },
        { step: 'project_match', status: 'pending' },
        { step: 'resume_generate', status: 'pending' },
        ...options.exportFormats.map((f) => ({ step: `export_${f}`, status: 'pending' })),
    ];
    await appRef.set({
        id: appRef.id,
        userId: user.uid,
        jobId: target.jobId,
        status: 'processing',
        steps,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    // Return immediately with 202 — processing continues below
    (0, response_1.success)(res, 202, {
        applicationId: appRef.id,
        jobId: target.jobId,
        status: 'processing',
        steps,
        trackUrl: `/api/apply/${appRef.id}/status`,
    });
    // --- Async pipeline (runs after response is sent) ---
    let totalTokens = 0;
    let totalCost = 0;
    try {
        // Step 1: JD Fetch
        const t0 = Date.now();
        await updateStep(appRef, steps, 'jd_fetch', 'in_progress');
        const jdRawText = job.rawDescription || '';
        await updateStep(appRef, steps, 'jd_fetch', 'completed', { durationMs: Date.now() - t0 });
        // Step 2: JD Parse
        const t1 = Date.now();
        await updateStep(appRef, steps, 'jd_parse', 'in_progress');
        const parsePrompt = (0, jdProfileService_1.buildJdParsePrompt)(jdRawText);
        const parseResp = await llm.complete(parsePrompt, options.llmModel);
        totalTokens += parseResp.tokensUsed;
        totalCost += parseResp.estimatedCost;
        const llmParsed = (0, jdProfileService_1.parseJdLlmResponse)(parseResp.text);
        const jdRef = db.collection('jd_profiles').doc();
        const jdProfile = (0, jdProfileService_1.buildJdProfile)(jdRef.id, user.uid, job.url ?? null, jdRawText, llmParsed);
        await jdRef.set(jdProfile);
        await updateStep(appRef, steps, 'jd_parse', 'completed', { durationMs: Date.now() - t1 });
        // Step 3: Project Match (Project Intelligence Layer)
        const t2 = Date.now();
        await updateStep(appRef, steps, 'project_match', 'in_progress');
        const projSnap = await db.collection('projects').where('userId', '==', user.uid).get();
        let projectMatchData = null;
        if (!projSnap.empty) {
            const projects = projSnap.docs.map((d) => d.data());
            const { ranked, selected, keywordStrategy } = (0, projectMatchService_1.runProjectScoring)(projects, jdProfile, 3);
            const allKeywords = [...jdProfile.mustHaveKeywords, ...jdProfile.niceToHaveKeywords];
            const bulletMap = {};
            const keywordMap = {};
            for (const proj of selected) {
                const prompt = (0, projectMatchService_1.buildBulletRewritePrompt)(proj, allKeywords);
                const resp = await llm.complete(prompt, options.llmModel);
                bulletMap[proj.id] = (0, projectMatchService_1.parseBulletResponse)(resp.text);
                totalTokens += resp.tokensUsed;
                totalCost += resp.estimatedCost;
                const projTech = new Set(proj.techTags.map((t) => t.toLowerCase()));
                keywordMap[proj.id] = allKeywords.filter((kw) => {
                    for (const pt of projTech) {
                        if (pt === kw || pt.includes(kw) || kw.includes(pt))
                            return true;
                    }
                    return false;
                });
            }
            const matchDocs = (0, projectMatchService_1.buildProjectMatchDocs)(user.uid, jdRef.id, ranked, 3, bulletMap, keywordMap, () => db.collection('project_matches').doc().id);
            const batch = db.batch();
            for (const doc of matchDocs) {
                batch.set(db.collection('project_matches').doc(doc.id), doc);
            }
            await batch.commit();
            projectMatchData = { ranked, selected, bulletMap, keywordStrategy, matchDocs };
        }
        await updateStep(appRef, steps, 'project_match', 'completed', { durationMs: Date.now() - t2 });
        // Step 4: Resume Generate
        const t3 = Date.now();
        await updateStep(appRef, steps, 'resume_generate', 'in_progress');
        // Resume generation would use projectMatchData to pre-fill project section
        // (Full implementation in resume service — placeholder here)
        await updateStep(appRef, steps, 'resume_generate', 'completed', { durationMs: Date.now() - t3 });
        // Step 5+: Exports
        for (const fmt of options.exportFormats) {
            const tN = Date.now();
            const stepName = `export_${fmt}`;
            await updateStep(appRef, steps, stepName, 'in_progress');
            // Export rendering (placeholder — PDF/DOCX services)
            await updateStep(appRef, steps, stepName, 'completed', { durationMs: Date.now() - tN });
        }
        // Mark application complete
        await appRef.update({
            status: 'completed',
            steps,
            updatedAt: new Date().toISOString(),
            cost: { provider: options.llmProvider, tokensUsed: totalTokens, estimatedCost: totalCost },
        });
    }
    catch (err) {
        const failedStep = steps.find((s) => s.status === 'in_progress');
        if (failedStep) {
            failedStep.status = 'failed';
            failedStep.error = err instanceof Error ? err.message : 'Unknown error';
        }
        await appRef.update({
            status: 'failed',
            steps,
            updatedAt: new Date().toISOString(),
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
});
//# sourceMappingURL=apply.fn.js.map