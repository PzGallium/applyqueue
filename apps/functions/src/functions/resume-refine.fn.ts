/**
 * Resume Refine API
 *
 * POST /api/resume/refine — generate a tailored resume from profile + JD.
 * Input: rawJdText, optional identityId, useProjectPool.
 * Output: resumeContent, changes[], identity used.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { UserProfile } from '@applyqueue/shared';
import { resumeRefineRequestSchema } from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';
import { getLlmClient } from '../utils/llm';
import { resolveCredential } from '../services/keys/credentialResolver';
import { generateResumeContent } from '../services/apply/resume-generator';
import type { ResumeContent } from '../services/apply/types';

const db = getFirestore();
const DEFAULT_LLM_PROVIDER = 'gemini';
const MIN_JD_LENGTH = 50;

export const resumeRefineApi = onRequest(
  { timeoutSeconds: 120, memory: '512MiB' },
  async (req, res) => {
    if (req.method !== 'POST') {
      error(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
      return;
    }

    const user = await verifyAuth(req, res);
    if (!user) return;

    const parsed = resumeRefineRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      error(res, 400, 'INVALID_INPUT', parsed.error.message);
      return;
    }

    const { rawJdText, identityId, llmProvider, llmModel } = parsed.data;
    const jdText = rawJdText.trim();
    if (jdText.length < MIN_JD_LENGTH) {
      error(res, 400, 'INVALID_INPUT', `JD text must be at least ${MIN_JD_LENGTH} characters`);
      return;
    }

    const userDoc = await db.doc(`users/${user.uid}`).get();
    if (!userDoc.exists) {
      error(res, 404, 'PROFILE_NOT_FOUND', 'User profile not found. Please complete your profile first.');
      return;
    }

    const profile = userDoc.data()?.profile as UserProfile | undefined;
    if (!profile?.headline || !profile.summary) {
      error(res, 404, 'PROFILE_NOT_FOUND', 'User profile missing or incomplete');
      return;
    }

    const credential = await resolveCredential(user.uid, llmProvider);
    if (!credential) {
      error(res, 400, 'CREDENTIAL_NOT_CONFIGURED', `No API key or OAuth for ${llmProvider}. Please connect in Settings.`);
      return;
    }

    let identity: { name: string; email: string; phone: string } | null = null;
    if (identityId) {
      const poolDoc = await db.doc(`identity_profiles/${user.uid}`).get();
      const pool = poolDoc.exists ? (poolDoc.data() as { items?: { id: string; name: string; email: string; phone: string }[] }) : null;
      const entry = pool?.items?.find((e) => e.id === identityId);
      if (entry) identity = { name: entry.name, email: entry.email, phone: entry.phone };
    }

    try {
      const llm = getLlmClient(llmProvider, credential, llmProvider === 'gemini' ? 'oauth' : 'api_key');
      const resumeContent = await generateResumeContent(llm, profile, jdText, llmModel);

      success(res, 200, {
        resumeContent: resumeContent as ResumeContent,
        changes: [] as { section: string; field: string; original: string; tailored: string; reason: string }[],
        identity,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resume generation failed';
      error(res, 500, 'GENERATION_FAILED', message);
    }
  },
);
