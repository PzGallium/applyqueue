/**
 * Resume Refine API
 *
 * POST /api/resume/refine — generate a tailored resume from identity + pool selections + JD (strict_empty).
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { IdentityEntry, UserProfile, UserProject } from '@applyqueue/shared';
import { resumeRefineRequestSchema } from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';
import { getLlmClient } from '../utils/llm';
import { resolveCredential } from '../services/keys/credentialResolver';
import { generateResumeContent } from '../services/apply/resume-generator';
import type { ResumeContent } from '../services/apply/types';
import {
  buildRefineProfile,
  normalizeIdentityEntry,
  validateSelectionAgainstProfile,
} from '../services/apply/refine-assembly';

const db = getFirestore();
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

    const {
      rawJdText,
      identityId,
      selectedExperienceIndices,
      selectedProjectIds,
      selectedEducationIndices,
      selectedSkillIndices,
      llmProvider,
      llmModel,
    } = parsed.data;
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
    if (!profile) {
      error(res, 404, 'PROFILE_NOT_FOUND', 'User profile missing or incomplete');
      return;
    }

    const poolDoc = await db.doc(`identity_profiles/${user.uid}`).get();
    const pool = poolDoc.exists ? (poolDoc.data() as { items?: IdentityEntry[] }) : null;
    const rawEntry = pool?.items?.find((e) => e.id === identityId);
    if (!rawEntry) {
      error(res, 400, 'INVALID_INPUT', 'Selected identity not found');
      return;
    }
    const identityNorm = normalizeIdentityEntry(rawEntry);

    const selErr = validateSelectionAgainstProfile(profile, {
      experienceIndices: selectedExperienceIndices,
      educationIndices: selectedEducationIndices,
      skillIndices: selectedSkillIndices,
    });
    if (selErr) {
      error(res, 400, 'INVALID_INPUT', selErr);
      return;
    }

    const uniqueProjectIds = [...new Set(selectedProjectIds)];
    const projectDocs: UserProject[] = [];
    if (uniqueProjectIds.length > 0) {
      const refs = await Promise.all(uniqueProjectIds.map((id) => db.doc(`projects/${id}`).get()));
      for (let i = 0; i < refs.length; i++) {
        const doc = refs[i]!;
        if (!doc.exists) {
          error(res, 400, 'INVALID_INPUT', `Project not found: ${uniqueProjectIds[i]}`);
          return;
        }
        const p = doc.data() as UserProject;
        if (p.userId !== user.uid) {
          error(res, 403, 'FORBIDDEN', 'Not your project');
          return;
        }
        projectDocs.push(p);
      }
    }

    const assembled = buildRefineProfile(
      profile,
      identityNorm,
      {
        experienceIndices: selectedExperienceIndices,
        educationIndices: selectedEducationIndices,
        skillIndices: selectedSkillIndices,
      },
      projectDocs,
    );

    const credential = await resolveCredential(user.uid, llmProvider);
    if (!credential) {
      error(res, 400, 'CREDENTIAL_NOT_CONFIGURED', `No API key or OAuth for ${llmProvider}. Please connect in Settings.`);
      return;
    }

    try {
      const llm = getLlmClient(llmProvider, credential, llmProvider === 'gemini' ? 'oauth' : 'api_key');
      const resumeContent = await generateResumeContent(llm, assembled, jdText, llmModel);
      resumeContent.headline = identityNorm.headline;
      resumeContent.summary = '';

      success(res, 200, {
        resumeContent: resumeContent as ResumeContent,
        changes: [] as { section: string; field: string; original: string; tailored: string; reason: string }[],
        identity: {
          name: identityNorm.name,
          email: identityNorm.email,
          phone: identityNorm.phone,
          headline: identityNorm.headline,
          location: identityNorm.location,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Resume generation failed';
      error(res, 500, 'GENERATION_FAILED', message);
    }
  },
);
