import type { Response } from 'express';
export declare function success(res: Response, status: number, data: unknown): void;
export declare function error(res: Response, status: number, code: string, message: string): void;
