import type { Response } from 'firebase-functions/v2/https';

export function success(res: Response, status: number, data: unknown): void {
  res.status(status).json(data);
}

export function error(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}
