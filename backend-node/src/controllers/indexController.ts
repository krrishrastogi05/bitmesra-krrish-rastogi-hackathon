import { Request, Response } from 'express';
import { z } from 'zod';
import { buildIndex, DEFAULT_INDEX_PARAMS as d } from '../services/indexRebalancer';
import { signalStore } from '../services/signalStore';

const query = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tilt: z.coerce.number().min(0).max(10).default(d.tilt),
  cap: z.coerce.number().min(0.07).max(1).default(d.cap),
  floor: z.coerce.number().min(0).max(0.06).default(d.floor),
  maxTurnover: z.coerce.number().min(0.01).max(1).default(d.maxTurnover),
  halfLifeDays: z.coerce.number().min(1).max(60).default(d.halfLifeDays),
  rebalance: z.enum(['daily', 'weekly']).default(d.rebalance),
});

export function getIndex(req: Request, res: Response): void {
  res.json(buildIndex(signalStore.companies(), signalStore.prices(), query.parse(req.query)));
}
