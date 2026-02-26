/**
 * Apply N orchestration function.
 *
 * POST /api/apply — triggers the full pipeline:
 *   1. jd_fetch   → fetch raw JD from job URL
 *   2. jd_parse   → LLM-parse JD into structured profile
 *   3. project_match → Project Intelligence: score, select, rewrite bullets
 *   4. resume_generate → generate tailored resume
 *   5. export_pdf  → render PDF
 *   6. export_docx → render DOCX
 *
 * Progress is written to the application document in Firestore
 * so the frontend can subscribe via onSnapshot.
 */
export declare const applyApi: import("firebase-functions/v2/https").HttpsFunction;
