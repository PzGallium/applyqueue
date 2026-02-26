import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) throw new Error('ENCRYPTION_MASTER_KEY not set');
  return Buffer.from(key, 'hex');
}

export function encryptKey(plaintext: string): { encryptedKey: string; iv: string; tag: string } {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getMasterKey(), iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptKey(encryptedKey: string, iv: string, tag: string): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    getMasterKey(),
    Buffer.from(iv, 'base64'),
    { authTagLength: TAG_LENGTH },
  );
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
export function decryptUserKey(
  keyDocData: Record<string, unknown>,
  provider: string,
): string | null {
  const keys = (keyDocData.keys ?? keyDocData) as Record<string, unknown>;
  const entry = keys[provider] as { encryptedKey: string; iv: string; tag: string } | undefined;
  if (!entry?.encryptedKey) return null;

  try {
    return decryptKey(entry.encryptedKey, entry.iv, entry.tag);
  } catch {
    return null;
  }
}
