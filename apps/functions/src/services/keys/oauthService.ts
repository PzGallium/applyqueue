import { randomBytes } from 'crypto';
import { LLM_PROVIDERS } from '@applyqueue/shared';

// ---------------------------------------------------------------------------
// Google OAuth 2.0 flow for Gemini API access
// ---------------------------------------------------------------------------

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
}

function getOAuthConfig(): OAuthConfig {
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
export function generateOAuthState(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Build the Google OAuth 2.0 authorization URL.
 * User's browser is redirected here to grant consent.
 */
export function buildAuthorizationUrl(
  provider: string,
  redirectUri: string,
  state: string,
): string {
  const config = getOAuthConfig();
  const providerConfig = LLM_PROVIDERS[provider];
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

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
  email?: string;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<OAuthTokens> {
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

  const data = await resp.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
  };

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
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
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

  const data = await resp.json() as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Revoke a token (access or refresh) with Google.
 * Called when user disconnects a provider.
 */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

async function fetchGoogleEmail(accessToken: string): Promise<string | undefined> {
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok) return undefined;
    const data = await resp.json() as { email?: string };
    return data.email;
  } catch {
    return undefined;
  }
}
