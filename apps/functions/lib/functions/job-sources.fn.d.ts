/**
 * Job Source Management CRUD API.
 *
 * POST   /api/job-sources       — add a new source to monitor
 * GET    /api/job-sources       — list configured sources for current user
 * DELETE /api/job-sources       — remove a source (query param: sourceId)
 */
export declare const jobSourcesApi: import("firebase-functions/v2/https").HttpsFunction;
