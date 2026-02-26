/**
 * Apply N MVP — POST /api/apply
 *
 * Sync flow: rankIndex → resolve job → get JD from DB → profile → LLM Resume JSON
 * → HTML → PDF → upload to Storage → signed URL. All steps write application status.
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { RankedList, RankedJob, Job, UserProfile } from '@applyqueue/shared';
import { applyMvpRequestSchema } from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';
import { getLlmClient } from '../utils/llm';
import { resolveCredential } from '../services/keys/credentialResolver';
import { decryptUserKey } from '../services/keys/crypto';
import { generateResumeContent } from '../services/apply/resume-generator';
import {
  exportResumeToPdf,
  buildPdfFilename,
} from '../services/apply/pdf-exporter';
import { uploadResumePdf } from '../services/apply/artifact-store';
import {
  APPLY_ERROR_CODES,
  type ApplyMvpStatus,
  type ApplyMvpSuccessResponse,
} from '../services/apply/types';

const db = getFirestore();
const MVP_LLM_PROVIDER = 'gemini';
const MIN_JD_LENGTH = 50;

async function updateApplicationStatus(
  applyId: string,
  status: ApplyMvpStatus,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const ref = db.collection('applications').doc(applyId);
  await ref.update({
    status,
    updatedAt: new Date().toISOString(),
    ...extra,
  });
}

export const applyApi = onRequest({ timeoutSeconds: 300 }, async (req, res) => {
  if (req.method !== 'POST') {
    error(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
    return;
  }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const parsed = applyMvpRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    error(res, 400, APPLY_ERROR_CODES.INVALID_INPUT, parsed.error.message);
    return;
  }
  const { rankIndex } = parsed.data;

  let applyId: string | undefined;
  let jobId: string;
  let job: { id: string; title: string; company: string; url?: string; rawDescription?: string };

  try {
    const rankDoc = await db.doc(`ranked_lists/${user.uid}`).get();
    if (!rankDoc.exists) {
      error(res, 404, APPLY_ERROR_CODES.RANKED_LIST_NOT_FOUND, 'Ranked list not found');
      return;
    }
    const list = rankDoc.data() as RankedList;
    const rankings = (list.rankings ?? []) as RankedJob[];
    const target = rankings.find((r) => r.rank === rankIndex);
    if (!target) {
      error(res, 404, APPLY_ERROR_CODES.RANK_INDEX_OUT_OF_RANGE, `No job at rank ${rankIndex}`);
      return;
    }
    jobId = target.jobId;

    const jobDoc = await db.doc(`jobs/${jobId}`).get();
    if (!jobDoc.exists) {
      error(res, 404, APPLY_ERROR_CODES.RANK_INDEX_OUT_OF_RANGE, 'Job no longer exists');
      return;
    }
    const jobData = jobDoc.data() as Job;
    job = {
      id: jobData.id,
      title: jobData.title,
      company: jobData.company,
      url: jobData.url,
      rawDescription: jobData.rawDescription,
    };

    const jdText = (job.rawDescription ?? '').trim();
    if (jdText.length < MIN_JD_LENGTH) {
      error(res, 400, APPLY_ERROR_CODES.JD_NOT_AVAILABLE, 'Job description not available or too short');
      return;
    }

    const userDoc = await db.doc(`users/${user.uid}`).get();
    if (!userDoc.exists) {
      error(res, 404, APPLY_ERROR_CODES.PROFILE_NOT_FOUND, 'User profile not found');
      return;
    }
    const profile = userDoc.data()?.profile as UserProfile | undefined;
    if (!profile?.headline || !profile.summary) {
      error(res, 404, APPLY_ERROR_CODES.PROFILE_NOT_FOUND, 'User profile missing or incomplete');
      return;
    }

    const appRef = db.collection('applications').doc();
    const applicationId = appRef.id;
    applyId = applicationId;
    await appRef.set({
      userId: user.uid,
      rankIndex,
      jobId,
      status: 'queued' as ApplyMvpStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await updateApplicationStatus(applicationId, 'jd_ready');

    let apiKey: string | null = await resolveCredential(user.uid, MVP_LLM_PROVIDER);
    if (!apiKey) {
      const keyDoc = await db.doc(`user_keys/${user.uid}`).get();
      if (keyDoc.exists) {
        apiKey = decryptUserKey(keyDoc.data()!, MVP_LLM_PROVIDER);
      }
    }
    if (!apiKey) {
      await updateApplicationStatus(applicationId, 'failed', {
        errorCode: APPLY_ERROR_CODES.INTERNAL_ERROR,
        errorMessage: 'Configure LLM API key for Gemini first',
      });
      error(res, 400, APPLY_ERROR_CODES.INTERNAL_ERROR, 'Configure LLM API key for Gemini first');
      return;
    }

    const llm = getLlmClient(MVP_LLM_PROVIDER, apiKey);
    let resumeContent;
    try {
      resumeContent = await generateResumeContent(llm, profile, jdText);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateApplicationStatus(applicationId, 'failed', {
        errorCode: APPLY_ERROR_CODES.LLM_GENERATION_FAILED,
        errorMessage: msg,
      });
      error(res, 502, APPLY_ERROR_CODES.LLM_GENERATION_FAILED, msg);
      return;
    }
    await updateApplicationStatus(applicationId, 'generated');

    const displayName = userDoc.data()?.displayName ?? 'Resume';
    const filename = buildPdfFilename(displayName, job.company, job.title);
    let buffer: Buffer;
    try {
      const result = await exportResumeToPdf(resumeContent, filename);
      buffer = result.buffer;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateApplicationStatus(applicationId, 'failed', {
        errorCode: APPLY_ERROR_CODES.PDF_EXPORT_FAILED,
        errorMessage: msg,
      });
      error(res, 500, APPLY_ERROR_CODES.PDF_EXPORT_FAILED, msg);
      return;
    }
    await updateApplicationStatus(applicationId, 'exported');

    let artifact: { path: string; downloadUrl: string; expiresAt: string };
    try {
      artifact = await uploadResumePdf(user.uid, applicationId, buffer);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await updateApplicationStatus(applicationId, 'failed', {
        errorCode: APPLY_ERROR_CODES.STORAGE_UPLOAD_FAILED,
        errorMessage: msg,
      });
      error(res, 500, APPLY_ERROR_CODES.STORAGE_UPLOAD_FAILED, msg);
      return;
    }
    await updateApplicationStatus(applicationId, 'done', {
      'artifact.path': artifact.path,
    });

    const body: ApplyMvpSuccessResponse = {
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
    success(res, 200, body);
  } catch (err) {
    const code = err instanceof Error ? err.message : String(err);
    if (typeof applyId === 'string') {
      await updateApplicationStatus(applyId, 'failed', {
        errorCode: APPLY_ERROR_CODES.INTERNAL_ERROR,
        errorMessage: code,
      });
    }
    error(res, 500, APPLY_ERROR_CODES.INTERNAL_ERROR, code);
  }
});
