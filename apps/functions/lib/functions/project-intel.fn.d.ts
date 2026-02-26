/**
 * Cloud Functions for the Project Intelligence Layer.
 *
 * POST /api/jd/parse                    — parse a JD into structured profile
 * POST /api/project-match/run           — run scoring + bullet gen
 * GET  /api/project-match/:jdProfileId  — retrieve previous match results
 */
export declare const jdParseApi: import("firebase-functions/v2/https").HttpsFunction;
export declare const projectMatchRunApi: import("firebase-functions/v2/https").HttpsFunction;
export declare const projectMatchGetApi: import("firebase-functions/v2/https").HttpsFunction;
