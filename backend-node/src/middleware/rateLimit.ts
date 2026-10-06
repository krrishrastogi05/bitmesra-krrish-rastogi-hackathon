import { NextFunction, Request, Response } from 'express';

/** Fixed-window rate limit per client IP.
 *  ponytail: in-memory map, one process only; move to Redis if the API runs on more than one instance. */
export function rateLimit(maxPerMinute: number) {
  const hits = new Map<string, { count: number; windowStart: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.windowStart > 60_000) {
      hits.set(key, { count: 1, windowStart: now });
      return next();
    }
    if (++entry.count > maxPerMinute) {
      res.status(429).json({ detail: 'Too many requests. Wait one minute and try again.' });
      return;
    }
    next();
  };
}
