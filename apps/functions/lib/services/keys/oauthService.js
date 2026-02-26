"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOAuthState = generateOAuthState;
exports.buildAuthorizationUrl = buildAuthorizationUrl;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
exports.refreshAccessToken = refreshAccessToken;
exports.revokeToken = revokeToken;
const crypto_1 = require("crypto");
const shared_1 = require("@applyqueue/shared");
function getOAuthConfig() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set');
    }
    return { clientId, clientSecret };
}
/**
 * Generate a cryptographically random state parameter for CSRF protection.
 */
function generateOAuthState() {
    return (0, crypto_1.randomBytes)(32).toString('hex');
}
/**
 * Build the Google OAuth 2.0 authorization URL.
 * User's browser is redirected here to grant consent.
 */
function buildAuthorizationUrl(provider, redirectUri, state) {
    const config = getOAuthConfig();
    const providerConfig = shared_1.LLM_PROVIDERS[provider];
    if (!providerConfig?.oauthScopes) {
        throw new Error(`Provider "${provider}" does not support OAuth`);
    }
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: providerConfig.oauthScopes.join(' '),
        state,
        access_type: 'offline',
        prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
/**
 * Exchange authorization code for access + refresh tokens.
 */
async function exchangeCodeForTokens(code, redirectUri) {
    const config = getOAuthConfig();
    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        }).toString(),
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`OAuth token exchange failed (${resp.status}): ${body}`);
    }
    const data = await resp.json();
    if (!data.refresh_token) {
        throw new Error('No refresh_token returned. Ensure access_type=offline and prompt=consent.');
    }
    const email = await fetchGoogleEmail(data.access_token);
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        scope: data.scope,
        email,
    };
}
/**
 * Refresh an expired access token using the refresh token.
 */
async function refreshAccessToken(refreshToken) {
    const config = getOAuthConfig();
    const resp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }).toString(),
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`OAuth token refresh failed (${resp.status}): ${body}`);
    }
    const data = await resp.json();
    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
    };
}
/**
 * Revoke a token (access or refresh) with Google.
 * Called when user disconnects a provider.
 */
async function revokeToken(token) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
}
async function fetchGoogleEmail(accessToken) {
    try {
        const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!resp.ok)
            return undefined;
        const data = await resp.json();
        return data.email;
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=oauthService.js.map