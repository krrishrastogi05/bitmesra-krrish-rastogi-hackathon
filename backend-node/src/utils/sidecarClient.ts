/**
 * HTTP client for the Python sidecar (NLP scoring + workbench sandbox).
 * The sidecar listens on the loopback address only. The browser never calls it directly.
 */
import { config } from '../config';
import { HttpError } from '../middleware/errorHandler';

async function sidecarFetch<T>(path: string, body?: unknown, timeoutMs = 35_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.sidecarUrl}${path}`, {
      method: body !== undefined ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new HttpError(503, 'The Python sidecar is not available. Start it with "python main.py" in the sidecar folder.');
  }
  if (!res.ok) throw new HttpError(502, `Sidecar ${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

export async function sidecarHealth(): Promise<boolean> {
  try {
    await sidecarFetch('/health', undefined, 1500);
    return true;
  } catch {
    return false;
  }
}

export interface ScoreResult {
  sentiment: number;
  event_class: string;
  class_method: string;
  impact: number;
  impact_parts: Record<string, number>;
  explain: Array<{ term: string; weight: number }>;
}

export interface WorkbenchResult {
  stdout: string;
  stderr: string;
  figures: string[];  // base64 PNG
  table: { columns: string[]; rows: unknown[][] } | null;
  error: string | null;
  success: boolean;
  ms: number;
}

export const scoreText = (text: string) => sidecarFetch<ScoreResult>('/score', { text });
export const runWorkbench = (code: string) => sidecarFetch<WorkbenchResult>('/workbench', { code });
