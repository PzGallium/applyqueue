/**
 * Generate a cryptographically random state parameter for CSRF protection.
 */
export declare function generateOAuthState(): string;
/**
 * Build the Google OAuth 2.0 authorization URL.
 * User's browser is redirected here to grant consent.
 */
export declare function buildAuthorizationUrl(provider: string, redirectUri: string, state: string): string;
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
export declare function exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens>;
/**
 * Refresh an expired access token using the refresh token.
 */
export declare function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
}>;
/**
 * Revoke a token (access or refresh) with Google.
 * Called when user disconnects a provider.
 */
export declare function revokeToken(token: string): Promise<void>;
