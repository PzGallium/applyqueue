"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyDeleteApi = exports.keyListApi = exports.keyValidateApi = exports.keyPutApi = exports.oauthCallbackApi = exports.oauthAuthorizeApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@applyqueue/shared");
const shared_2 = require("@applyqueue/shared");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const llm_1 = require("../utils/llm");
const credentialResolver_1 = require("../services/keys/credentialResolver");
const oauthService_1 = require("../services/keys/oauthService");
const db = (0, firestore_1.getFirestore)();
// =========================================================================
// OAuth endpoints
// =========================================================================
/**
 * GET /api/keys/oauth/authorize/:provider
 * Returns an OAuth authorization URL for the user to visit.
 */
exports.oauthAuthorizeApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'GET') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const pathParts = req.path.split('/').filter(Boolean);
    const provider = pathParts[pathParts.length - 1];
    if (!shared_2.OAUTH_PROVIDERS.includes(provider)) {
        (0, response_1.error)(res, 400, 'INVALID_PROVIDER', `"${provider}" does not support OAuth. Supported: ${shared_2.OAUTH_PROVIDERS.join(', ')}`);
        return;
    }
    const redirectUri = `${req.headers.origin || 'https://applyqueue.com'}/auth/oauth/callback`;
    const state = (0, oauthService_1.generateOAuthState)();
    // Store state temporarily for CSRF validation (expires in 10 min)
    await db.collection('oauth_states').doc(state).set({
        userId: user.uid,
        provider,
        redirectUri,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    const authUrl = (0, oauthService_1.buildAuthorizationUrl)(provider, redirectUri, state);
    (0, response_1.success)(res, 200, { authUrl, state });
});
/**
 * POST /api/keys/oauth/callback
 * Handles the OAuth callback: exchanges code for tokens, stores encrypted.
 */
exports.oauthCallbackApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'POST') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.oauthCallbackSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
        return;
    }
    const { provider, code, state, redirectUri } = parsed.data;
    // Validate state for CSRF protection
    const stateDoc = await db.doc(`oauth_states/${state}`).get();
    if (!stateDoc.exists) {
        (0, response_1.error)(res, 400, 'INVALID_STATE', 'OAuth state is invalid or expired');
        return;
    }
    const stateData = stateDoc.data();
    if (stateData.userId !== user.uid || stateData.provider !== provider) {
        (0, response_1.error)(res, 400, 'STATE_MISMATCH', 'OAuth state does not match current user');
        return;
    }
    if (new Date(stateData.expiresAt) < new Date()) {
        (0, response_1.error)(res, 400, 'STATE_EXPIRED', 'OAuth state has expired. Please try again.');
        return;
    }
    // Clean up used state
    await db.doc(`oauth_states/${state}`).delete();
    // Exchange code for tokens
    try {
        const tokens = await (0, oauthService_1.exchangeCodeForTokens)(code, redirectUri);
        await (0, credentialResolver_1.storeOAuthConnection)(user.uid, provider, tokens);
        (0, response_1.success)(res, 200, {
            provider,
            mode: 'oauth',
            connected: true,
            displayLabel: tokens.email ?? 'Google Account',
        });
    }
    catch (err) {
        (0, response_1.error)(res, 400, 'OAUTH_EXCHANGE_FAILED', err instanceof Error ? err.message : 'Token exchange failed');
    }
});
// =========================================================================
// BYOK API Key endpoints
// =========================================================================
/**
 * PUT /api/keys
 * Save an API key (encrypted). For advanced users.
 */
exports.keyPutApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'PUT') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use PUT');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.keyUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
        return;
    }
    const { provider, apiKey } = parsed.data;
    const allConfigs = { ...shared_2.LLM_PROVIDERS, ...shared_2.SEARCH_PROVIDERS };
    const providerConfig = allConfigs[provider];
    if (providerConfig?.keyPattern && !providerConfig.keyPattern.test(apiKey)) {
        (0, response_1.error)(res, 400, 'INVALID_KEY_FORMAT', `Key does not match expected format for ${provider}. Expected prefix: ${providerConfig.keyPrefix}`);
        return;
    }
    try {
        await (0, credentialResolver_1.storeApiKeyConnection)(user.uid, provider, apiKey);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('ENCRYPTION_MASTER_KEY')) {
            (0, response_1.error)(res, 503, 'SERVER_CONFIG_ERROR', 'Encryption is not configured. Set ENCRYPTION_MASTER_KEY in the environment.');
            return;
        }
        (0, response_1.error)(res, 500, 'SAVE_FAILED', 'Failed to save API key. Please try again.');
        return;
    }
    (0, response_1.success)(res, 200, {
        provider,
        mode: 'api_key',
        connected: true,
        updatedAt: new Date().toISOString(),
    });
});
/**
 * POST /api/keys/validate
 * Validate an API key by making a minimal API call.
 */
exports.keyValidateApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'POST') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.keyValidateSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
        return;
    }
    const { provider, apiKey: providedKey } = parsed.data;
    // Use provided key or resolve stored one
    let credential = providedKey ?? null;
    if (!credential) {
        credential = await (0, credentialResolver_1.resolveCredential)(user.uid, provider);
    }
    if (!credential) {
        (0, response_1.error)(res, 400, 'NO_CREDENTIAL', `No credential found for ${provider}. Connect it first.`);
        return;
    }
    const providerConfig = shared_2.LLM_PROVIDERS[provider];
    if (!providerConfig) {
        (0, response_1.error)(res, 400, 'INVALID_PROVIDER', `Unknown provider: ${provider}`);
        return;
    }
    try {
        const client = (0, llm_1.getLlmClient)(provider, credential, providedKey ? 'api_key' : 'oauth');
        const resp = await client.complete('Say "ok" in one word.', providerConfig.defaultModel);
        (0, response_1.success)(res, 200, {
            provider,
            valid: true,
            model: providerConfig.defaultModel,
            message: `Key is valid. Test response: "${resp.text.trim().slice(0, 20)}"`,
            tokensUsed: resp.tokensUsed,
        });
    }
    catch (err) {
        (0, response_1.success)(res, 200, {
            provider,
            valid: false,
            message: err instanceof Error ? err.message : 'Validation failed',
        });
    }
});
// =========================================================================
// Shared endpoints
// =========================================================================
/**
 * GET /api/keys
 * List all configured providers (without exposing secrets).
 */
exports.keyListApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'GET') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const connections = await (0, credentialResolver_1.listConnections)(user.uid);
    const allProviders = { ...shared_2.LLM_PROVIDERS, ...shared_2.SEARCH_PROVIDERS };
    const result = Object.entries(allProviders).map(([key, config]) => {
        const existing = connections.find((c) => c.provider === key);
        return {
            provider: key,
            name: config.name,
            supportedModes: config.supportedModes,
            primaryMode: config.primaryMode,
            connected: !!existing,
            configured: !!existing,
            mode: existing?.mode ?? null,
            displayLabel: existing?.displayLabel ?? null,
            updatedAt: existing?.updatedAt ?? null,
        };
    });
    (0, response_1.success)(res, 200, { keys: result, providers: result });
});
/**
 * DELETE /api/keys
 * Remove a provider connection (API key or OAuth).
 * For OAuth, also revokes the token with Google.
 */
exports.keyDeleteApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'DELETE') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use DELETE');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const parsed = shared_1.keyDeleteSchema.safeParse(req.body ?? req.query);
    if (!parsed.success) {
        (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
        return;
    }
    const { provider } = parsed.data;
    // Try to revoke OAuth token before deleting
    const credential = await (0, credentialResolver_1.resolveCredential)(user.uid, provider);
    if (credential && shared_2.OAUTH_PROVIDERS.includes(provider)) {
        try {
            await (0, oauthService_1.revokeToken)(credential);
        }
        catch { /* best-effort revocation */ }
    }
    const deleted = await (0, credentialResolver_1.removeConnection)(user.uid, provider);
    if (!deleted) {
        (0, response_1.error)(res, 404, 'NOT_FOUND', `No connection found for ${provider}`);
        return;
    }
    (0, response_1.success)(res, 200, { provider, deleted: true });
});
//# sourceMappingURL=keys.fn.js.map