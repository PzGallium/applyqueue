/**
 * Resolve a usable credential (API key or OAuth access token) for a provider.
 * Handles OAuth token auto-refresh transparently.
 *
 * Returns the plaintext credential string, or null if not configured.
 */
export declare function resolveCredential(userId: string, provider: string): Promise<string | null>;
/**
 * Store a new API key connection for a provider.
 */
export declare function storeApiKeyConnection(userId: string, provider: string, apiKey: string): Promise<void>;
/**
 * Store a new OAuth connection for a provider.
 */
export declare function storeOAuthConnection(userId: string, provider: string, tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
    email?: string;
}): Promise<void>;
/**
 * Remove a provider connection. Optionally revokes OAuth tokens.
 */
export declare function removeConnection(userId: string, provider: string): Promise<boolean>;
/**
 * List all configured providers (without exposing secrets).
 */
export declare function listConnections(userId: string): Promise<Array<{
    provider: string;
    mode: string;
    displayLabel: string;
    connected: boolean;
    updatedAt: string;
}>>;
