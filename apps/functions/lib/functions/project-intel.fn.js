"use strict";
/**
 * Cloud Functions for the Project Intelligence Layer.
 *
 * POST /api/jd/parse                    — parse a JD into structured profile
 * POST /api/project-match/run           — run scoring + bullet gen
 * GET  /api/project-match/:jdProfileId  — retrieve previous match results
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectMatchGetApi = exports.projectMatchRunApi = exports.jdParseApi = void 0;
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
// -------------------------------------------------------------------------
// POST /api/jd/parse
// -------------------------------------------------------------------------
exports.jdParseApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'POST') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.jdParseRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
        return;
    }
    const { rawText, sourceUrl, llmProvider, llmModel } = parsed.data;
    // Decrypt user's LLM key
    const keyDoc = await db.doc(`user_keys/${user.uid}`).get();
    if (!keyDoc.exists) {
        (0, response_1.error)(res, 400, 'NO_API_KEY', 'Configure your LLM API key first');
        return;
    }
    const apiKey = (0, crypto_1.decryptUserKey)(keyDoc.data(), llmProvider);
    if (!apiKey) {
        (0, response_1.error)(res, 400, 'MISSING_PROVIDER_KEY', `No key for provider: ${llmProvider}`);
        return;
    }
    // Call LLM
    const client = (0, llm_1.getLlmClient)(llmProvider, apiKey);
    const prompt = (0, jdProfileService_1.buildJdParsePrompt)(rawText);
    const llmResponse = await client.complete(prompt, llmModel);
    // Parse + store
    const llmParsed = (0, jdProfileService_1.parseJdLlmResponse)(llmResponse.text);
    const docRef = db.collection('jd_profiles').doc();
    const jdProfile = (0, jdProfileService_1.buildJdProfile)(docRef.id, user.uid, sourceUrl ?? null, rawText, llmParsed);
    await docRef.set(jdProfile);
    (0, response_1.success)(res, 200, {
        jdProfile,
        cost: { provider: llmProvider, tokensUsed: llmResponse.tokensUsed, estimatedCost: llmResponse.estimatedCost },
    });
});
// -------------------------------------------------------------------------
// POST /api/project-match/run
// -------------------------------------------------------------------------
exports.projectMatchRunApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'POST') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.projectMatchRunSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
        return;
    }
    const { jdProfileId, topK, llmProvider, llmModel } = parsed.data;
    // Fetch JD profile
    const jdDoc = await db.doc(`jd_profiles/${jdProfileId}`).get();
    if (!jdDoc.exists) {
        (0, response_1.error)(res, 404, 'JD_NOT_FOUND', 'JD profile not found');
        return;
    }
    const jd = jdDoc.data();
    if (jd.userId !== user.uid) {
        (0, response_1.error)(res, 403, 'FORBIDDEN', 'Not your JD profile');
        return;
    }
    // Fetch user projects
    const projSnap = await db.collection('projects').where('userId', '==', user.uid).get();
    if (projSnap.empty) {
        (0, response_1.error)(res, 400, 'NO_PROJECTS', 'Add projects to your pool first');
        return;
    }
    const projects = projSnap.docs.map((d) => d.data());
    // 1. Deterministic scoring
    const { ranked, selected, keywordStrategy } = (0, projectMatchService_1.runProjectScoring)(projects, jd, topK);
    // 2. LLM bullet rewriting for selected projects
    const keyDoc = await db.doc(`user_keys/${user.uid}`).get();
    if (!keyDoc.exists) {
        (0, response_1.error)(res, 400, 'NO_API_KEY', 'Configure your LLM API key first');
        return;
    }
    const apiKey = (0, crypto_1.decryptUserKey)(keyDoc.data(), llmProvider);
    if (!apiKey) {
        (0, response_1.error)(res, 400, 'MISSING_PROVIDER_KEY', `No key for provider: ${llmProvider}`);
        return;
    }
    const client = (0, llm_1.getLlmClient)(llmProvider, apiKey);
    const allKeywords = [...jd.mustHaveKeywords, ...jd.niceToHaveKeywords];
    const bulletMap = {};
    const keywordMap = {};
    let totalTokens = 0;
    let totalCost = 0;
    // Run bullet generation for each selected project (sequential to respect rate limits)
    for (const proj of selected) {
        const prompt = (0, projectMatchService_1.buildBulletRewritePrompt)(proj, allKeywords);
        const resp = await client.complete(prompt, llmModel);
        bulletMap[proj.id] = (0, projectMatchService_1.parseBulletResponse)(resp.text);
        totalTokens += resp.tokensUsed;
        totalCost += resp.estimatedCost;
        // Keywords this project covers
        const projTech = new Set(proj.techTags.map((t) => t.toLowerCase()));
        keywordMap[proj.id] = allKeywords.filter((kw) => {
            for (const pt of projTech) {
                if (pt === kw || pt.includes(kw) || kw.includes(pt))
                    return true;
            }
            return false;
        });
    }
    // 3. Persist match documents
    const matchDocs = (0, projectMatchService_1.buildProjectMatchDocs)(user.uid, jdProfileId, ranked, topK, bulletMap, keywordMap, () => db.collection('project_matches').doc().id);
    const batch = db.batch();
    for (const doc of matchDocs) {
        batch.set(db.collection('project_matches').doc(doc.id), doc);
    }
    await batch.commit();
    // 4. Build response
    const result = (0, projectMatchService_1.buildMatchResult)(jdProfileId, ranked, topK, matchDocs, keywordStrategy, bulletMap);
    (0, response_1.success)(res, 200, {
        ...result,
        cost: { provider: llmProvider, tokensUsed: totalTokens, estimatedCost: totalCost },
    });
});
// -------------------------------------------------------------------------
// GET /api/project-match/:jdProfileId
// -------------------------------------------------------------------------
exports.projectMatchGetApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'GET') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    // Extract jdProfileId from path: /api/project-match/:jdProfileId
    const pathParts = req.path.split('/').filter(Boolean);
    const jdProfileId = pathParts[pathParts.length - 1];
    if (!jdProfileId) {
        (0, response_1.error)(res, 400, 'MISSING_ID', 'Provide jdProfileId in URL');
        return;
    }
    // Verify ownership
    const jdDoc = await db.doc(`jd_profiles/${jdProfileId}`).get();
    if (!jdDoc.exists) {
        (0, response_1.error)(res, 404, 'JD_NOT_FOUND', 'JD profile not found');
        return;
    }
    const jd = jdDoc.data();
    if (jd.userId !== user.uid) {
        (0, response_1.error)(res, 403, 'FORBIDDEN', 'Not your JD profile');
        return;
    }
    // Fetch matches
    const matchSnap = await db.collection('project_matches')
        .where('jdProfileId', '==', jdProfileId)
        .where('userId', '==', user.uid)
        .orderBy('rank', 'asc')
        .get();
    const matches = matchSnap.docs.map((d) => d.data());
    // Fetch associated projects
    const projectIds = [...new Set(matches.map((m) => m.projectId))];
    const projectDocs = await Promise.all(projectIds.map((id) => db.doc(`projects/${id}`).get()));
    const projectMap = new Map(projectDocs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
    const selectedMatches = matches.filter((m) => m.selected);
    const selectedProjects = selectedMatches.map((m) => projectMap.get(m.projectId)).filter(Boolean);
    const keywordStrategy = selectedProjects.length > 0
        ? (await Promise.resolve().then(() => __importStar(require('@applyqueue/shared')))).buildKeywordStrategy(selectedProjects, jd)
        : { mustInclude: [], goodToInclude: [], currentlyMissing: [] };
    const bulletSuggestions = {};
    for (const m of selectedMatches) {
        bulletSuggestions[m.projectId] = m.generatedBullets;
    }
    (0, response_1.success)(res, 200, {
        jdProfileId,
        selectedProjects: selectedMatches.map((m) => ({
            rank: m.rank,
            project: projectMap.get(m.projectId),
            match: m,
        })),
        allMatches: matches,
        keywordStrategy,
        bulletSuggestions,
        explanation: (0, projectMatchService_1.buildExplanation)(matches.map((m) => ({
            project: projectMap.get(m.projectId),
            scoreTotal: m.scoreTotal,
            scoreBreakdown: m.scoreBreakdown,
        })), selectedMatches.length),
    });
});
//# sourceMappingURL=project-intel.fn.js.map