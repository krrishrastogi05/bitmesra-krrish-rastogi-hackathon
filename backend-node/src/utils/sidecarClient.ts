/**
 * HTTP client for the Python sidecar (sklearn inference + code sandbox).
 * Sidecar runs on localhost:8090 and is never exposed to the frontend.
 */
import { config } from '../config';

async function sidecarFetch<T>(path: string, body?: Record<string, any>): Promise<T> {
  const url = `${config.sidecarUrl}${path}`;
  const res = await fetch(url, {
    method: body !== undefined ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sidecar ${path} returned ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function sidecarHealth(): Promise<boolean> {
  try {
    await sidecarFetch('/health');
    return true;
  } catch {
    return false;
  }
}

export interface ExecuteCodeResult {
  stdout: string;
  stderr: string;
  result_json: any;
  artifacts: Array<{ type: string; b64: string }>;
  error?: string;
  success: boolean;
}

export interface ExecuteCodeOptions {
  code: string;
  session_id?: string;
  rows?: Record<string, any>[];
  timeout_s?: number;
}

export async function sidecarExecuteCode(opts: ExecuteCodeOptions): Promise<ExecuteCodeResult> {
  return sidecarFetch<ExecuteCodeResult>('/execute-code', {
    code: opts.code,
    session_id: opts.session_id,
    rows: opts.rows,
    timeout_s: opts.timeout_s ?? 30,
  });
}
