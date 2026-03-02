/**
 * Resume Refine API
 *
 * POST /api/resume/refine — generate a tailored resume from profile + JD.
 * Input: rawJdText, optional identityId, useProjectPool.
 * Output: resumeContent, changes[], identity used.
 */
export declare const resumeRefineApi: import("firebase-functions/v2/https").HttpsFunction;
