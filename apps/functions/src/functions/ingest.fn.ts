/**
 * Job ingestion Cloud Functions.
 *
 * Scheduled:
 *   ingestScheduled — runs twice daily (9:00, 21:00 UTC)
 *
 * HTTP (debug / manual trigger):
 *   POST /api/ingest/trigger — manually trigger the full pipeline
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';
import { runIngestPipeline } from '../services/ingest/orchestrator';

export const ingestScheduled = onSchedule(
  { schedule: '0 9,21 * * *', timeZone: 'America/Los_Angeles', timeoutSeconds: 540 },
  async () => {
    const result = await runIngestPipeline();
    console.log('[ingest] Pipeline complete:', JSON.stringify(result));
  },
);

export const ingestTriggerApi = onRequest({ timeoutSeconds: 540 }, async (req, res) => {
  if (req.method !== 'POST') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const result = await runIngestPipeline();
  success(res, 200, result);
});
