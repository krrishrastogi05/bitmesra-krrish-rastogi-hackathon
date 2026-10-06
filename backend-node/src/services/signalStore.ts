import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { HttpError } from '../middleware/errorHandler';
import type { CompanySignal, EventSignal, Post, Prices, Universe } from '../types/signals';

const cache = new Map<string, { mtimeMs: number; data: unknown }>();

/** Reads one engine output file. The file is parsed again only when it changes on disk. */
function read<T>(file: string): T {
  const full = path.join(config.dataDir, 'signals', file);
  let stat: fs.Stats;
  try {
    stat = fs.statSync(full);
  } catch {
    throw new HttpError(503, `Signal file ${file} is missing. Run "python -m engine.pipeline" in the sidecar folder.`);
  }
  const hit = cache.get(full);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.data as T;
  const data = JSON.parse(fs.readFileSync(full, 'utf-8')) as T;
  cache.set(full, { mtimeMs: stat.mtimeMs, data });
  return data;
}

export const signalStore = {
  companies: () => read<CompanySignal[]>('company_daily.json'),
  events: () => read<EventSignal[]>('events.json'),
  posts: () => read<Post[]>('posts.json'),
  prices: () => read<Prices>('prices.json'),
  universe: () => read<Universe>('universe.json'),
  pipeline: () => read<unknown>('pipeline.json'),
  modelReport: () => read<unknown>('model_report.json'),
};
