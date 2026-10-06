import { Request, Response } from 'express';
import { z } from 'zod';
import { signalStore } from '../services/signalStore';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');
const inRange = (d: string, q: { date?: string; from?: string; to?: string }) =>
  (!q.date || d === q.date) && (!q.from || d >= q.from) && (!q.to || d <= q.to);

const companyQuery = z.object({ ticker: z.string().max(8).optional(), date: date.optional(), from: date.optional(), to: date.optional() });
const eventQuery = z.object({
  date: date.optional(), from: date.optional(), to: date.optional(),
  minImpact: z.coerce.number().int().min(1).max(10).optional(),
  eventClass: z.string().max(20).optional(),
});
const postQuery = z.object({ ticker: z.string().max(8).optional(), date: date.optional() });

export function getUniverse(_req: Request, res: Response): void {
  res.json(signalStore.universe());
}

/** Daily close per ticker: { ticker: [[date, close], ...] }. */
export function getPrices(_req: Request, res: Response): void {
  res.json(signalStore.prices());
}

export function getCompanies(req: Request, res: Response): void {
  const q = companyQuery.parse(req.query);
  res.json(signalStore.companies().filter((s) => (!q.ticker || s.ticker === q.ticker.toUpperCase()) && inRange(s.date, q)));
}

export function getEvents(req: Request, res: Response): void {
  const q = eventQuery.parse(req.query);
  res.json(signalStore.events().filter((e) =>
    inRange(e.date, q) && (!q.minImpact || e.impact >= q.minImpact) && (!q.eventClass || e.event_class === q.eventClass)));
}

export function getPosts(req: Request, res: Response): void {
  const q = postQuery.parse(req.query);
  res.json(signalStore.posts().filter((p) =>
    (!q.ticker || p.tickers.includes(q.ticker.toUpperCase())) && (!q.date || p.ts.startsWith(q.date))));
}

/** The hackathon deliverable: one row per company-day or event with the three required fields. */
export function exportCsv(_req: Request, res: Response): void {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    'kind,date,entity,sentiment_score,event_classification,impact_score',
    ...signalStore.companies().map((s) => `company,${s.date},${s.ticker},${s.sentiment},${esc(s.event_class)},${s.impact}`),
    ...signalStore.events().map((e) => `event,${e.date},${esc(e.headline)},${e.sentiment},${esc(e.event_class)},${e.impact}`),
  ];
  res.type('text/csv').attachment('meridian_signals.csv').send(rows.join('\n'));
}

export function getPipeline(_req: Request, res: Response): void {
  res.json(signalStore.pipeline());
}

export function getModelReport(_req: Request, res: Response): void {
  res.json(signalStore.modelReport());
}
