export declare function encryptKey(plaintext: string): {
    encryptedKey: string;
    iv: string;
    tag: string;
};
export declare function decryptKey(encryptedKey: string, iv: string, tag: string): string;
/**
 * Extract and decrypt a specific provider's key from the user_keys document.
 * Returns null if the provider key is not configured.
 */
export declare function decryptUserKey(keyDocData: Record<string, unknown>, provider: string): string | null;
