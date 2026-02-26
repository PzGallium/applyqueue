import { getFirestore } from 'firebase-admin/firestore';
import type { ProviderConnection, EncryptedValue } from '@applyqueue/shared';
import { encryptKey, decryptKey } from './crypto';
import { refreshAccessToken } from './oauthService';

const db = getFirestore();

/**
 * Resolve a usable credential (API key or OAuth access token) for a provider.
 * Handles OAuth token auto-refresh transparently.
 *
 * Returns the plaintext credential string, or null if not configured.
 */
export async function resolveCredential(
  userId: string,
  provider: string,
): Promise<string | null> {
  const docRef = db.doc(`user_keys/${userId}`);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  const connections = (data.connections ?? {}) as Record<string, ProviderConnection>;
  const conn = connections[provider];
  if (!conn) return null;

  if (conn.mode === 'api_key' && conn.apiKey) {
    return decryptValue(conn.apiKey);
  }

  if (conn.mode === 'oauth' && conn.oauth) {
    const now = new Date();
    const expiresAt = new Date(conn.oauth.expiresAt);
    const bufferMs = 5 * 60 * 1000; // refresh 5 min before expiry

    if (now.getTime() < expiresAt.getTime() - bufferMs) {
      return decryptValue(conn.oauth.accessToken);
    }

    // Token expired or near-expiry — refresh
    const refreshToken = decryptValue(conn.oauth.refreshToken);
    try {
      const refreshed = await refreshAccessToken(refreshToken);

      const newAccessEncrypted = encryptValue(refreshed.accessToken);
      const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();

      await docRef.update({
        [`connections.${provider}.oauth.accessToken`]: newAccessEncrypted,
        [`connections.${provider}.oauth.expiresAt`]: newExpiresAt,
        [`connections.${provider}.updatedAt`]: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return refreshed.accessToken;
    } catch {
      // Refresh failed — token may be revoked
      return null;
    }
  }

  return null;
}

/**
 * Store a new API key connection for a provider.
 */
export async function storeApiKeyConnection(
  userId: string,
  provider: string,
  apiKey: string,
): Promise<void> {
  const encrypted = encryptValue(apiKey);
  const masked = `${apiKey.slice(0, 5)}...${apiKey.slice(-4)}`;

  const conn: ProviderConnection = {
    provider,
    mode: 'api_key',
    apiKey: encrypted,
    displayLabel: masked,
    updatedAt: new Date().toISOString(),
  };

  await upsertConnection(userId, provider, conn);
}

/**
 * Store a new OAuth connection for a provider.
 */
export async function storeOAuthConnection(
  userId: string,
  provider: string,
  tokens: { accessToken: string; refreshToken: string; expiresIn: number; scope: string; email?: string },
): Promise<void> {
  const conn: ProviderConnection = {
    provider,
    mode: 'oauth',
    oauth: {
      accessToken: encryptValue(tokens.accessToken),
      refreshToken: encryptValue(tokens.refreshToken),
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
      scope: tokens.scope,
      email: tokens.email,
    },
    displayLabel: tokens.email ?? 'Google Account',
    updatedAt: new Date().toISOString(),
  };

  await upsertConnection(userId, provider, conn);
}

/**
 * Remove a provider connection. Optionally revokes OAuth tokens.
 */
export async function removeConnection(userId: string, provider: string): Promise<boolean> {
  const docRef = db.doc(`user_keys/${userId}`);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  const connections = (doc.data()!.connections ?? {}) as Record<string, ProviderConnection>;
  if (!connections[provider]) return false;

  delete connections[provider];
  await docRef.update({ connections, updatedAt: new Date().toISOString() });
  return true;
}

/**
 * List all configured providers (without exposing secrets).
 */
export async function listConnections(userId: string): Promise<Array<{
  provider: string;
  mode: string;
  displayLabel: string;
  connected: boolean;
  updatedAt: string;
}>> {
  const doc = await db.doc(`user_keys/${userId}`).get();
  if (!doc.exists) return [];

  const connections = (doc.data()!.connections ?? {}) as Record<string, ProviderConnection>;
  return Object.values(connections).map((c) => ({
    provider: c.provider,
    mode: c.mode,
    displayLabel: c.displayLabel,
    connected: true,
    updatedAt: c.updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// Helpers — thin wrappers to adapt existing crypto to EncryptedValue shape
// ---------------------------------------------------------------------------

function encryptValue(plaintext: string): EncryptedValue {
  const { encryptedKey, iv, tag } = encryptKey(plaintext);
  return { ciphertext: encryptedKey, iv, tag };
}

function decryptValue(ev: EncryptedValue): string {
  return decryptKey(ev.ciphertext, ev.iv, ev.tag);
}

async function upsertConnection(
  userId: string,
  provider: string,
  conn: ProviderConnection,
): Promise<void> {
  const docRef = db.doc(`user_keys/${userId}`);
  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({
      connections: { [provider]: conn },
      updatedAt: new Date().toISOString(),
    });
  } else {
    await docRef.update({
      [`connections.${provider}`]: conn,
      updatedAt: new Date().toISOString(),
    });
  }
}
