/**
 * Applications read API — list and get by ID (user-isolated).
 *
 * GET /api/applications       — list current user's applications (newest first)
 * GET /api/applications/:id   — get one application (must belong to user)
 */
export declare const applicationsApi: import("firebase-functions/v2/https").HttpsFunction;
