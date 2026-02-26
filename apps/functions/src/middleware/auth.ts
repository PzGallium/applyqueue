import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import { getAuth } from 'firebase-admin/auth';

export interface AuthUser {
  uid: string;
  email: string;
}

/**
 * Verify Firebase ID token from Authorization header.
 * Returns decoded user or sends 401 and returns null.
 */
export async function verifyAuth(req: Request, res: Response): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } });
    return null;
  }

  try {
    const token = header.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email ?? '' };
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
    return null;
  }
}
