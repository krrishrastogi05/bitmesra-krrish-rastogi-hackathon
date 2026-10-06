import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../app';

/** An error that is safe to show to the client, with its HTTP status. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ detail: 'Not found' });
}

/** Sends validation and known errors as JSON. Hides internal error details from the client. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ detail: 'Invalid request', issues: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ detail: err.message });
    return;
  }
  logger.error(err, 'Unhandled error');
  res.status(500).json({ detail: 'Internal server error' });
}
