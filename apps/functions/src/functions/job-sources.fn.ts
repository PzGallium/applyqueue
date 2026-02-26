/**
 * Job Source Management CRUD API.
 *
 * POST   /api/job-sources       — add a new source to monitor
 * GET    /api/job-sources       — list configured sources for current user
 * DELETE /api/job-sources       — remove a source (query param: sourceId)
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { jobSourceCreateSchema, jobSourceDeleteSchema } from '@applyqueue/shared';
import type { JobSourceConfig } from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';

const db = getFirestore();
const col = () => db.collection('job_sources');

export const jobSourcesApi = onRequest(async (req, res) => {
  const user = await verifyAuth(req, res);
  if (!user) return;

  if (req.method === 'POST') {
    const parsed = jobSourceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      error(res, 400, 'VALIDATION_ERROR', parsed.error.message);
      return;
    }

    const ref = col().doc();
    const now = new Date().toISOString();
    const source: JobSourceConfig = {
      id: ref.id,
      ...parsed.data,
      isEnabled: true,
      lastRunAt: null,
      lastRunStatus: null,
      jobCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set({ ...source, userId: user.uid });
    success(res, 201, source);
    return;
  }

  if (req.method === 'GET') {
    const snap = await col()
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const sources = snap.docs.map((d) => {
      const data = d.data();
      delete data.userId;
      return data as JobSourceConfig;
    });
    success(res, 200, { sources });
    return;
  }

  if (req.method === 'DELETE') {
    const parsed = jobSourceDeleteSchema.safeParse(req.query);
    if (!parsed.success) {
      error(res, 400, 'VALIDATION_ERROR', 'Missing sourceId query param');
      return;
    }

    const { sourceId } = parsed.data;
    const docRef = col().doc(sourceId);
    const doc = await docRef.get();

    if (!doc.exists) {
      error(res, 404, 'NOT_FOUND', 'Source not found');
      return;
    }

    if (doc.data()?.userId !== user.uid) {
      error(res, 403, 'FORBIDDEN', 'Not your source');
      return;
    }

    await docRef.delete();
    success(res, 200, { deleted: true, sourceId });
    return;
  }

  error(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET, POST, or DELETE');
});
