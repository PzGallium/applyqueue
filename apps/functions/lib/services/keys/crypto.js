"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptKey = encryptKey;
exports.decryptKey = decryptKey;
exports.decryptUserKey = decryptUserKey;
const crypto_1 = require("crypto");
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
function getMasterKey() {
    const key = process.env.ENCRYPTION_MASTER_KEY;
    if (!key)
        throw new Error('ENCRYPTION_MASTER_KEY not set');
    return Buffer.from(key, 'hex');
}
function encryptKey(plaintext) {
    const iv = (0, crypto_1.randomBytes)(IV_LENGTH);
    const cipher = (0, crypto_1.createCipheriv)(ALGORITHM, getMasterKey(), iv, { authTagLength: TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        encryptedKey: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
    };
}
function decryptKey(encryptedKey, iv, tag) {
    const decipher = (0, crypto_1.createDecipheriv)(ALGORITHM, getMasterKey(), Buffer.from(iv, 'base64'), { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedKey, 'base64')),
        decipher.final(),
    ]);
    return decrypted.toString('utf8');
}
/**
 * Extract and decrypt a specific provider's key from the user_keys document.
 * Returns null if the provider key is not configured.
 */
function decryptUserKey(keyDocData, provider) {
    const keys = (keyDocData.keys ?? keyDocData);
    const entry = keys[provider];
    if (!entry?.encryptedKey)
        return null;
    try {
        return decryptKey(entry.encryptedKey, entry.iv, entry.tag);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=crypto.js.map