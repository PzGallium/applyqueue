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

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import {
  keyUpdateSchema,
  oauthCallbackSchema,
  keyValidateSchema,
  keyDeleteSchema,
} from '@applyqueue/shared';
import { LLM_PROVIDERS, SEARCH_PROVIDERS, OAUTH_PROVIDERS } from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';
import { getLlmClient } from '../utils/llm';
import {
  resolveCredential,
  storeApiKeyConnection,
  storeOAuthConnection,
  removeConnection,
  listConnections,
} from '../services/keys/credentialResolver';
import {
  generateOAuthState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  revokeToken,
} from '../services/keys/oauthService';

const db = getFirestore();

// =========================================================================
// OAuth endpoints
// =========================================================================

/**
 * GET /api/keys/oauth/authorize/:provider
 * Returns an OAuth authorization URL for the user to visit.
 */
export const oauthAuthorizeApi = onRequest(async (req, res) => {
  if (req.method !== 'GET') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const pathParts = req.path.split('/').filter(Boolean);
  const provider = pathParts[pathParts.length - 1];

  if (!OAUTH_PROVIDERS.includes(provider)) {
    error(res, 400, 'INVALID_PROVIDER', `"${provider}" does not support OAuth. Supported: ${OAUTH_PROVIDERS.join(', ')}`);
    return;
  }

  const redirectUri = `${req.headers.origin || 'https://applyqueue.com'}/auth/oauth/callback`;
  const state = generateOAuthState();

  // Store state temporarily for CSRF validation (expires in 10 min)
  await db.collection('oauth_states').doc(state).set({
    userId: user.uid,
    provider,
    redirectUri,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const authUrl = buildAuthorizationUrl(provider, redirectUri, state);

  success(res, 200, { authUrl, state });
});

/**
 * POST /api/keys/oauth/callback
 * Handles the OAuth callback: exchanges code for tokens, stores encrypted.
 */
export const oauthCallbackApi = onRequest(async (req, res) => {
  if (req.method !== 'POST') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const parsed = oauthCallbackSchema.safeParse(req.body);
  if (!parsed.success) { error(res, 400, 'VALIDATION_ERROR', parsed.error.message); return; }

  const { provider, code, state, redirectUri } = parsed.data;

  // Validate state for CSRF protection
  const stateDoc = await db.doc(`oauth_states/${state}`).get();
  if (!stateDoc.exists) {
    error(res, 400, 'INVALID_STATE', 'OAuth state is invalid or expired');
    return;
  }
  const stateData = stateDoc.data()!;
  if (stateData.userId !== user.uid || stateData.provider !== provider) {
    error(res, 400, 'STATE_MISMATCH', 'OAuth state does not match current user');
    return;
  }
  if (new Date(stateData.expiresAt) < new Date()) {
    error(res, 400, 'STATE_EXPIRED', 'OAuth state has expired. Please try again.');
    return;
  }

  // Clean up used state
  await db.doc(`oauth_states/${state}`).delete();

  // Exchange code for tokens
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    await storeOAuthConnection(user.uid, provider, tokens);

    success(res, 200, {
      provider,
      mode: 'oauth',
      connected: true,
      displayLabel: tokens.email ?? 'Google Account',
    });
  } catch (err) {
    error(res, 400, 'OAUTH_EXCHANGE_FAILED', err instanceof Error ? err.message : 'Token exchange failed');
  }
});

// =========================================================================
// BYOK API Key endpoints
// =========================================================================

/**
 * PUT /api/keys
 * Save an API key (encrypted). For advanced users.
 */
export const keyPutApi = onRequest(async (req, res) => {
  if (req.method !== 'PUT') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use PUT'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const parsed = keyUpdateSchema.safeParse(req.body);
  if (!parsed.success) { error(res, 400, 'VALIDATION_ERROR', parsed.error.message); return; }

  const { provider, apiKey } = parsed.data;

  // Format validation
  const providerConfig = { ...LLM_PROVIDERS, ...SEARCH_PROVIDERS }[provider];
  if (providerConfig?.keyPattern && !providerConfig.keyPattern.test(apiKey)) {
    error(res, 400, 'INVALID_KEY_FORMAT', `Key does not match expected format for ${provider}. Expected prefix: ${providerConfig.keyPrefix}`);
    return;
  }

  await storeApiKeyConnection(user.uid, provider, apiKey);

  success(res, 200, {
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
export const keyValidateApi = onRequest(async (req, res) => {
  if (req.method !== 'POST') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use POST'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const parsed = keyValidateSchema.safeParse(req.body);
  if (!parsed.success) { error(res, 400, 'VALIDATION_ERROR', parsed.error.message); return; }

  const { provider, apiKey: providedKey } = parsed.data;

  // Use provided key or resolve stored one
  let credential: string | null = providedKey ?? null;
  if (!credential) {
    credential = await resolveCredential(user.uid, provider);
  }
  if (!credential) {
    error(res, 400, 'NO_CREDENTIAL', `No credential found for ${provider}. Connect it first.`);
    return;
  }

  const providerConfig = LLM_PROVIDERS[provider];
  if (!providerConfig) {
    error(res, 400, 'INVALID_PROVIDER', `Unknown provider: ${provider}`);
    return;
  }

  try {
    const client = getLlmClient(provider, credential, providedKey ? 'api_key' : 'oauth');
    const resp = await client.complete('Say "ok" in one word.', providerConfig.defaultModel);

    success(res, 200, {
      provider,
      valid: true,
      model: providerConfig.defaultModel,
      message: `Key is valid. Test response: "${resp.text.trim().slice(0, 20)}"`,
      tokensUsed: resp.tokensUsed,
    });
  } catch (err) {
    success(res, 200, {
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
export const keyListApi = onRequest(async (req, res) => {
  if (req.method !== 'GET') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const connections = await listConnections(user.uid);

  // Merge with all available providers to show unconfigured ones too
  const allProviders = { ...LLM_PROVIDERS, ...SEARCH_PROVIDERS };
  const result = Object.entries(allProviders).map(([key, config]) => {
    const existing = connections.find((c) => c.provider === key);
    return {
      provider: key,
      name: config.name,
      supportedModes: config.supportedModes,
      primaryMode: config.primaryMode,
      connected: !!existing,
      mode: existing?.mode ?? null,
      displayLabel: existing?.displayLabel ?? null,
      updatedAt: existing?.updatedAt ?? null,
    };
  });

  success(res, 200, { providers: result });
});

/**
 * DELETE /api/keys
 * Remove a provider connection (API key or OAuth).
 * For OAuth, also revokes the token with Google.
 */
export const keyDeleteApi = onRequest(async (req, res) => {
  if (req.method !== 'DELETE') { error(res, 405, 'METHOD_NOT_ALLOWED', 'Use DELETE'); return; }

  const user = await verifyAuth(req, res);
  if (!user) return;

  const parsed = keyDeleteSchema.safeParse(req.body ?? req.query);
  if (!parsed.success) { error(res, 400, 'VALIDATION_ERROR', parsed.error.message); return; }

  const { provider } = parsed.data;

  // Try to revoke OAuth token before deleting
  const credential = await resolveCredential(user.uid, provider);
  if (credential && OAUTH_PROVIDERS.includes(provider)) {
    try { await revokeToken(credential); } catch { /* best-effort revocation */ }
  }

  const deleted = await removeConnection(user.uid, provider);
  if (!deleted) {
    error(res, 404, 'NOT_FOUND', `No connection found for ${provider}`);
    return;
  }

  success(res, 200, { provider, deleted: true });
});
