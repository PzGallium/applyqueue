/**
 * Key Management API — OAuth-first, BYOK-ready.
 *
 * OAuth endpoints (primary path):
 *   GET  /api/keys/oauth/authorize/:provider  — generate OAuth authorization URL
 *   POST /api/keys/oauth/callback             — handle OAuth callback, store tokens
 *
 * BYOK endpoints (advanced path):
 *   PUT    /api/keys          — save an API key (encrypted)
 *   POST   /api/keys/validate — validate an API key with a lightweight API call
 *
 * Shared endpoints:
 *   GET    /api/keys          — list configured providers (no secrets)
 *   DELETE /api/keys          — remove a provider connection
 */
/**
 * GET /api/keys/oauth/authorize/:provider
 * Returns an OAuth authorization URL for the user to visit.
 */
export declare const oauthAuthorizeApi: import("firebase-functions/v2/https").HttpsFunction;
/**
 * POST /api/keys/oauth/callback
 * Handles the OAuth callback: exchanges code for tokens, stores encrypted.
 */
export declare const oauthCallbackApi: import("firebase-functions/v2/https").HttpsFunction;
/**
 * PUT /api/keys
 * Save an API key (encrypted). For advanced users.
 */
export declare const keyPutApi: import("firebase-functions/v2/https").HttpsFunction;
/**
 * POST /api/keys/validate
 * Validate an API key by making a minimal API call.
 */
export declare const keyValidateApi: import("firebase-functions/v2/https").HttpsFunction;
/**
 * GET /api/keys
 * List all configured providers (without exposing secrets).
 */
export declare const keyListApi: import("firebase-functions/v2/https").HttpsFunction;
/**
 * DELETE /api/keys
 * Remove a provider connection (API key or OAuth).
 * For OAuth, also revokes the token with Google.
 */
export declare const keyDeleteApi: import("firebase-functions/v2/https").HttpsFunction;
/**
 * Single handler for /api/keys (GET, PUT, DELETE) for Hosting rewrites.
 */
export declare const keyKeysApi: import("firebase-functions/v2/https").HttpsFunction;
