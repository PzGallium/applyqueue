/**
 * Cloud Functions for the Project Intelligence Layer.
 *
 * POST /api/jd/parse                    — parse a JD into structured profile
 * POST /api/project-match/run           — run scoring + bullet gen
 * GET  /api/project-match/:jdProfileId  — retrieve previous match results
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { UserProject, JdProfile, ProjectMatch } from '@applyqueue/shared';
import { jdParseRequestSchema, projectMatchRunSchema } from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';
import { getLlmClient } from '../utils/llm';
import { decryptUserKey } from '../services/keys/crypto';
import {
  buildJdParsePrompt,
  parseJdLlmResponse,
  buildJdProfile,
} from '../services/project-intel/jdProfileService';
import {
  runProjectScoring,
  buildBulletRewritePrompt,
  parseBulletResponse,
  buildProjectMatchDocs,
  buildMatchResult,
  buildExplanation,
} from '../services/project-intel/projectMatchService';

const db = getFirestore();

// -------------------------------------------------------------------------
// POST /api/jd/parse
// -------------------------------------------------------------------------
export const jdParseApi = onRequest(async (req, res) => {
  if (req.method !== 'POST') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const parsed = jdParseRequestSchema.safeParse(req.body);
  if (!parsed.success) { error(res, 400, 'VALIDATION_ERROR', parsed.error.message); return; }

  const { rawText, sourceUrl, llmProvider, llmModel } = parsed.data;

  // Decrypt user's LLM key
  const keyDoc = await db.doc(`user_keys/${user.uid}`).get();
  if (!keyDoc.exists) { error(res, 400, 'NO_API_KEY', 'Configure your LLM API key first'); return; }
  const apiKey = decryptUserKey(keyDoc.data()!, llmProvider);
  if (!apiKey) { error(res, 400, 'MISSING_PROVIDER_KEY', `No key for provider: ${llmProvider}`); return; }

  // Call LLM
  const client = getLlmClient(llmProvider, apiKey);
  const prompt = buildJdParsePrompt(rawText);
  const llmResponse = await client.complete(prompt, llmModel);

  // Parse + store
  const llmParsed = parseJdLlmResponse(llmResponse.text);
  const docRef = db.collection('jd_profiles').doc();
  const jdProfile = buildJdProfile(docRef.id, user.uid, sourceUrl ?? null, rawText, llmParsed);
  await docRef.set(jdProfile);

  success(res, 200, {
    jdProfile,
    cost: { provider: llmProvider, tokensUsed: llmResponse.tokensUsed, estimatedCost: llmResponse.estimatedCost },
  });
});

// -------------------------------------------------------------------------
// POST /api/project-match/run
// -------------------------------------------------------------------------
export const projectMatchRunApi = onRequest(async (req, res) => {
  if (req.method !== 'POST') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const parsed = projectMatchRunSchema.safeParse(req.body);
  if (!parsed.success) { error(res, 400, 'VALIDATION_ERROR', parsed.error.message); return; }

  const { jdProfileId, topK, llmProvider, llmModel } = parsed.data;

  // Fetch JD profile
  const jdDoc = await db.doc(`jd_profiles/${jdProfileId}`).get();
  if (!jdDoc.exists) { error(res, 404, 'JD_NOT_FOUND', 'JD profile not found'); return; }
  const jd = jdDoc.data() as JdProfile;
  if (jd.userId !== user.uid) { error(res, 403, 'FORBIDDEN', 'Not your JD profile'); return; }

  // Fetch user projects
  const projSnap = await db.collection('projects').where('userId', '==', user.uid).get();
  if (projSnap.empty) { error(res, 400, 'NO_PROJECTS', 'Add projects to your pool first'); return; }
  const projects = projSnap.docs.map((d) => d.data() as UserProject);

  // 1. Deterministic scoring
  const { ranked, selected, keywordStrategy } = runProjectScoring(projects, jd, topK);

  // 2. LLM bullet rewriting for selected projects
  const keyDoc = await db.doc(`user_keys/${user.uid}`).get();
  if (!keyDoc.exists) { error(res, 400, 'NO_API_KEY', 'Configure your LLM API key first'); return; }
  const apiKey = decryptUserKey(keyDoc.data()!, llmProvider);
  if (!apiKey) { error(res, 400, 'MISSING_PROVIDER_KEY', `No key for provider: ${llmProvider}`); return; }

  const client = getLlmClient(llmProvider, apiKey);
  const allKeywords = [...jd.mustHaveKeywords, ...jd.niceToHaveKeywords];

  const bulletMap: Record<string, string[]> = {};
  const keywordMap: Record<string, string[]> = {};
  let totalTokens = 0;
  let totalCost = 0;

  // Run bullet generation for each selected project (sequential to respect rate limits)
  for (const proj of selected) {
    const prompt = buildBulletRewritePrompt(proj, allKeywords);
    const resp = await client.complete(prompt, llmModel);
    bulletMap[proj.id] = parseBulletResponse(resp.text);
    totalTokens += resp.tokensUsed;
    totalCost += resp.estimatedCost;

    // Keywords this project covers
    const projTech = new Set(proj.techTags.map((t) => t.toLowerCase()));
    keywordMap[proj.id] = allKeywords.filter((kw) => {
      for (const pt of projTech) {
        if (pt === kw || pt.includes(kw) || kw.includes(pt)) return true;
      }
      return false;
    });
  }

  // 3. Persist match documents
  const matchDocs = buildProjectMatchDocs(
    user.uid,
    jdProfileId,
    ranked,
    topK,
    bulletMap,
    keywordMap,
    () => db.collection('project_matches').doc().id,
  );

  const batch = db.batch();
  for (const doc of matchDocs) {
    batch.set(db.collection('project_matches').doc(doc.id), doc);
  }
  await batch.commit();

  // 4. Build response
  const result = buildMatchResult(jdProfileId, ranked, topK, matchDocs, keywordStrategy, bulletMap);

  success(res, 200, {
    ...result,
    cost: { provider: llmProvider, tokensUsed: totalTokens, estimatedCost: totalCost },
  });
});

// -------------------------------------------------------------------------
// GET /api/project-match/:jdProfileId
// -------------------------------------------------------------------------
export const projectMatchGetApi = onRequest(async (req, res) => {
  if (req.method !== 'GET') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  // Extract jdProfileId from path: /api/project-match/:jdProfileId
  const pathParts = req.path.split('/').filter(Boolean);
  const jdProfileId = pathParts[pathParts.length - 1];
  if (!jdProfileId) { error(res, 400, 'MISSING_ID', 'Provide jdProfileId in URL'); return; }

  // Verify ownership
  const jdDoc = await db.doc(`jd_profiles/${jdProfileId}`).get();
  if (!jdDoc.exists) { error(res, 404, 'JD_NOT_FOUND', 'JD profile not found'); return; }
  const jd = jdDoc.data() as JdProfile;
  if (jd.userId !== user.uid) { error(res, 403, 'FORBIDDEN', 'Not your JD profile'); return; }

  // Fetch matches
  const matchSnap = await db.collection('project_matches')
    .where('jdProfileId', '==', jdProfileId)
    .where('userId', '==', user.uid)
    .orderBy('rank', 'asc')
    .get();

  const matches = matchSnap.docs.map((d) => d.data() as ProjectMatch);

  // Fetch associated projects
  const projectIds = [...new Set(matches.map((m) => m.projectId))];
  const projectDocs = await Promise.all(
    projectIds.map((id) => db.doc(`projects/${id}`).get()),
  );
  const projectMap = new Map(
    projectDocs.filter((d) => d.exists).map((d) => [d.id, d.data() as UserProject]),
  );

  const selectedMatches = matches.filter((m) => m.selected);
  const selectedProjects = selectedMatches.map((m) => projectMap.get(m.projectId)!).filter(Boolean);
  const keywordStrategy = selectedProjects.length > 0
    ? (await import('@applyqueue/shared')).buildKeywordStrategy(selectedProjects, jd)
    : { mustInclude: [], goodToInclude: [], currentlyMissing: [] };

  const bulletSuggestions: Record<string, string[]> = {};
  for (const m of selectedMatches) {
    bulletSuggestions[m.projectId] = m.generatedBullets;
  }

  success(res, 200, {
    jdProfileId,
    selectedProjects: selectedMatches.map((m) => ({
      rank: m.rank,
      project: projectMap.get(m.projectId),
      match: m,
    })),
    allMatches: matches,
    keywordStrategy,
    bulletSuggestions,
    explanation: buildExplanation(
      matches.map((m) => ({
        project: projectMap.get(m.projectId)!,
        scoreTotal: m.scoreTotal,
        scoreBreakdown: m.scoreBreakdown,
      })),
      selectedMatches.length,
    ),
  });
});
