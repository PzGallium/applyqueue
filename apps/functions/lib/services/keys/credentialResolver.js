"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCredential = resolveCredential;
exports.storeApiKeyConnection = storeApiKeyConnection;
exports.storeOAuthConnection = storeOAuthConnection;
exports.removeConnection = removeConnection;
exports.listConnections = listConnections;
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("./crypto");
const oauthService_1 = require("./oauthService");
const db = (0, firestore_1.getFirestore)();
/**
 * Resolve a usable credential (API key or OAuth access token) for a provider.
 * Handles OAuth token auto-refresh transparently.
 *
 * Returns the plaintext credential string, or null if not configured.
 */
async function resolveCredential(userId, provider) {
    const docRef = db.doc(`user_keys/${userId}`);
    const doc = await docRef.get();
    if (!doc.exists)
        return null;
    const data = doc.data();
    const connections = (data.connections ?? {});
    const conn = connections[provider];
    if (!conn)
        return null;
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
            const refreshed = await (0, oauthService_1.refreshAccessToken)(refreshToken);
            const newAccessEncrypted = encryptValue(refreshed.accessToken);
            const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();
            await docRef.update({
                [`connections.${provider}.oauth.accessToken`]: newAccessEncrypted,
                [`connections.${provider}.oauth.expiresAt`]: newExpiresAt,
                [`connections.${provider}.updatedAt`]: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            return refreshed.accessToken;
        }
        catch {
            // Refresh failed — token may be revoked
            return null;
        }
    }
    return null;
}
/**
 * Store a new API key connection for a provider.
 */
async function storeApiKeyConnection(userId, provider, apiKey) {
    const encrypted = encryptValue(apiKey);
    const masked = `${apiKey.slice(0, 5)}...${apiKey.slice(-4)}`;
    const conn = {
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
async function storeOAuthConnection(userId, provider, tokens) {
    const conn = {
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
async function removeConnection(userId, provider) {
    const docRef = db.doc(`user_keys/${userId}`);
    const doc = await docRef.get();
    if (!doc.exists)
        return false;
    const connections = (doc.data().connections ?? {});
    if (!connections[provider])
        return false;
    delete connections[provider];
    await docRef.update({ connections, updatedAt: new Date().toISOString() });
    return true;
}
/**
 * List all configured providers (without exposing secrets).
 */
async function listConnections(userId) {
    const doc = await db.doc(`user_keys/${userId}`).get();
    if (!doc.exists)
        return [];
    const connections = (doc.data().connections ?? {});
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
function encryptValue(plaintext) {
    const { encryptedKey, iv, tag } = (0, crypto_1.encryptKey)(plaintext);
    return { ciphertext: encryptedKey, iv, tag };
}
function decryptValue(ev) {
    return (0, crypto_1.decryptKey)(ev.ciphertext, ev.iv, ev.tag);
}
async function upsertConnection(userId, provider, conn) {
    const docRef = db.doc(`user_keys/${userId}`);
    const doc = await docRef.get();
    if (!doc.exists) {
        await docRef.set({
            connections: { [provider]: conn },
            updatedAt: new Date().toISOString(),
        });
    }
    else {
        await docRef.update({
            [`connections.${provider}`]: conn,
            updatedAt: new Date().toISOString(),
        });
    }
}
//# sourceMappingURL=credentialResolver.js.map