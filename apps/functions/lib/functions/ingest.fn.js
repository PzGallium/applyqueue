"use strict";
/**
 * Job ingestion Cloud Functions.
 *
 * Scheduled:
 *   ingestScheduled — runs twice daily (9:00, 21:00 UTC)
 *
 * HTTP (debug / manual trigger):
 *   POST /api/ingest/trigger — manually trigger the full pipeline
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestTriggerApi = exports.ingestScheduled = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const orchestrator_1 = require("../services/ingest/orchestrator");
exports.ingestScheduled = (0, scheduler_1.onSchedule)({ schedule: '0 9,21 * * *', timeZone: 'America/Los_Angeles', timeoutSeconds: 540 }, async () => {
    const result = await (0, orchestrator_1.runIngestPipeline)();
    console.log('[ingest] Pipeline complete:', JSON.stringify(result));
});
exports.ingestTriggerApi = (0, https_1.onRequest)({ timeoutSeconds: 540 }, async (req, res) => {
    if (req.method !== 'POST') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const result = await (0, orchestrator_1.runIngestPipeline)();
    (0, response_1.success)(res, 200, result);
});
//# sourceMappingURL=ingest.fn.js.map