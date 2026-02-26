import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
export interface AuthUser {
    uid: string;
    email: string;
}
/**
 * Verify Firebase ID token from Authorization header.
 * Returns decoded user or sends 401 and returns null.
 */
export declare function verifyAuth(req: Request, res: Response): Promise<AuthUser | null>;
