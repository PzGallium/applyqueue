import type { Response } from 'express';

export function success(res: Response, status: number, data: unknown): void {
  res.status(status).json(data);
}

export function error(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ error: { code, message } });
}
