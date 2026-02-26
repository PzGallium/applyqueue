/**
 * Apply N MVP — POST /api/apply
 *
 * Sync flow: rankIndex → resolve job → get JD from DB → profile → LLM Resume JSON
 * → HTML → PDF → upload to Storage → signed URL. All steps write application status.
 */
export declare const applyApi: import("firebase-functions/v2/https").HttpsFunction;
