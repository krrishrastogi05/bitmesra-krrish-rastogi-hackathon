import { useCallback, useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/** Call the Meridian API. Throws an Error with the server's "detail" message on failure. */
export async function api(path, options = {}) {
  const res = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
  return body;
}

export const post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) });

/** Load one API path. Loads again when the path changes. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const load = useCallback(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    api(path)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error) => setState({ data: null, error: error.message, loading: false }));
  }, [path]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}

export const CLASS_COLOR = {
  Geopolitical: '#ff4d4f',
  Macro: '#ffb020',
  'Credit Event': '#e879f9',
  'M&A': '#22d3ee',
  'Product Launch': '#34d399',
  Other: '#64748b',
};

export const fmtPct = (x, d = 1) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(d)}%`;
export const fmtM = (x) => `${x < 0 ? '-' : ''}$${Math.abs(x).toFixed(1)}M`;
export const sentColor = (s) => (s > 0.15 ? 'var(--up)' : s < -0.15 ? 'var(--down)' : 'var(--muted)');
