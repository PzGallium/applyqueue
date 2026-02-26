/**
 * Job ingestion Cloud Functions.
 *
 * Scheduled:
 *   ingestScheduled — runs twice daily (9:00, 21:00 UTC)
 *
 * HTTP (debug / manual trigger):
 *   POST /api/ingest/trigger — manually trigger the full pipeline
 */
export declare const ingestScheduled: import("firebase-functions/v2/scheduler").ScheduleFunction;
export declare const ingestTriggerApi: import("firebase-functions/v2/https").HttpsFunction;
