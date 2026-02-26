/**
 * Ranked List API
 *
 * GET /api/ranked-list — get current user's ranked jobs with full job details
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import type { RankedList, RankedJob, Job } from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';

const db = getFirestore();
const IN_CHUNK = 10;

async function getJobsByIds(jobIds: string[]): Promise<Map<string, Job>> {
  const map = new Map<string, Job>();
  for (let i = 0; i < jobIds.length; i += IN_CHUNK) {
    const chunk = jobIds.slice(i, i + IN_CHUNK);
    const snap = await db.collection('jobs').where(FieldPath.documentId(), 'in', chunk).get();
    snap.docs.forEach((d) => map.set(d.id, d.data() as Job));
  }
  return map;
}

export const rankedListApi = onRequest(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET');
    return;
  }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const listDoc = await db.doc(`ranked_lists/${user.uid}`).get();
  if (!listDoc.exists) {
    success(res, 200, {
      list: null,
      items: [],
      generatedAt: null,
    });
    return;
  }

  const list = listDoc.data() as RankedList;
  const rankings = list.rankings ?? [];
  if (rankings.length === 0) {
    success(res, 200, {
      list: { ...list, rankings: [] },
      items: [],
      generatedAt: list.generatedAt ?? null,
    });
    return;
  }

  const jobIds = rankings.map((r: RankedJob) => r.jobId);
  const jobsMap = await getJobsByIds(jobIds);

  const items = rankings.map((r: RankedJob) => ({
    rank: r.rank,
    score: r.score,
    scoreBreakdown: r.scoreBreakdown,
    addedAt: r.addedAt,
    job: jobsMap.get(r.jobId) ?? null,
  }));

  success(res, 200, {
    list: {
      userId: list.userId,
      totalJobs: list.totalJobs,
      generatedAt: list.generatedAt,
      filters: list.filters,
    },
    items,
    generatedAt: list.generatedAt ?? null,
  });
});
