import type { CompanySignal, Prices } from '../types/signals';

/** Module A: a sentiment-tilted equal-weight index over the stock universe.
 *
 *  Methodology (also returned to the UI so it can show the rules):
 *  1. Start from equal weights.
 *  2. Each ticker has a sentiment score: an exponential moving average of its daily signals,
 *     known at the close of day t and used for the weights of day t+1 (no look-ahead).
 *  3. Target weight = equal weight x exp(tilt x sentiment), then clamp each weight to [floor, cap].
 *  4. On each rebalance date, move toward the target, but limit one-way turnover to maxTurnover.
 *  5. Between rebalances, weights drift with prices.
 */
export interface IndexParams {
  from?: string;
  to?: string;
  tilt: number;          // strength of the sentiment tilt
  cap: number;           // max weight per stock
  floor: number;         // min weight per stock
  maxTurnover: number;   // max one-way turnover per rebalance
  halfLifeDays: number;  // sentiment EMA half-life
  rebalance: 'daily' | 'weekly';
}

export const DEFAULT_INDEX_PARAMS: IndexParams = {
  tilt: 2.5, cap: 0.15, floor: 0.02, maxTurnover: 0.2, halfLifeDays: 5, rebalance: 'weekly',
};

export interface IndexResult {
  tickers: string[];
  dates: string[];
  weights: Record<string, number[]>;
  sentiment: Record<string, number[]>;
  index: number[];
  benchmark: number[];
  turnover: number[];
  rebalanceDates: string[];
  stats: { totalReturn: number; benchmarkReturn: number; volatility: number; maxDrawdown: number; avgTurnover: number };
  methodology: IndexParams;
}

/** Clamp weights to [floor, cap] and keep the sum at 1. Moves the excess to stocks that are not clamped. */
export function clampWeights(w: number[], floor: number, cap: number): number[] {
  let out = w.map((x) => x / w.reduce((a, b) => a + b, 0));
  for (let iter = 0; iter < 50; iter++) {
    const fixed = out.map((x) => x >= cap || x <= floor);
    const clamped = out.map((x) => Math.min(cap, Math.max(floor, x)));
    const fixedSum = clamped.reduce((a, x, i) => a + (fixed[i] ? x : 0), 0);
    const freeSum = out.reduce((a, x, i) => a + (fixed[i] ? 0 : x), 0);
    if (freeSum === 0) return clamped;
    const scale = (1 - fixedSum) / freeSum;
    const next = out.map((x, i) => (fixed[i] ? clamped[i] : x * scale));
    if (next.every((x, i) => Math.abs(x - out[i]) < 1e-12)) return next;
    out = next;
  }
  return out;
}

function stdev(xs: number[]): number {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, xs.length - 1));
}

export function buildIndex(signals: CompanySignal[], prices: Prices, p: IndexParams): IndexResult {
  const tickers = Object.keys(prices).sort();
  const n = tickers.length;
  const closeBy = new Map<string, Map<string, number>>(tickers.map((t) => [t, new Map(prices[t])]));
  const allDates = [...new Set(tickers.flatMap((t) => prices[t].map(([d]) => d)))].sort();
  const dates = allDates.filter((d) => (!p.from || d >= p.from) && (!p.to || d <= p.to) && tickers.every((t) => closeBy.get(t)!.has(d)));

  // Daily signal per ticker, keyed by date.
  const sigBy = new Map<string, number>();
  for (const s of signals) sigBy.set(`${s.ticker}|${s.date}`, s.sentiment);

  // Sentiment EMA per ticker. updateEma(d) adds every signal dated up to d, once.
  const alpha = 1 - Math.pow(0.5, 1 / p.halfLifeDays);
  const ema = new Array(n).fill(0);
  const signalDates = [...new Set(signals.map((s) => s.date))].sort();
  let next = 0;
  const updateEma = (upTo: string) => {
    for (; next < signalDates.length && signalDates[next] <= upTo; next++) {
      tickers.forEach((t, i) => {
        const v = sigBy.get(`${t}|${signalDates[next]}`);
        if (v !== undefined) ema[i] += alpha * (v - ema[i]);
      });
    }
  };
  updateEma(dates[0] ?? ''); // warm-up: all signals before the first index date

  let w = new Array(n).fill(1 / n);
  const weights: Record<string, number[]> = Object.fromEntries(tickers.map((t) => [t, []]));
  const sentiment: Record<string, number[]> = Object.fromEntries(tickers.map((t) => [t, []]));
  const index = [100];
  const benchmark = [100];
  const turnover = [0];
  const rebalanceDates: string[] = [];
  const dailyRet: number[] = [];

  const record = () => tickers.forEach((t, i) => { weights[t].push(+w[i].toFixed(5)); sentiment[t].push(+ema[i].toFixed(4)); });
  record();

  for (let k = 1; k < dates.length; k++) {
    const prev = dates[k - 1];
    const d = dates[k];
    // 1) Returns over (prev, d] with the weights set at the close of prev.
    const r = tickers.map((t) => closeBy.get(t)!.get(d)! / closeBy.get(t)!.get(prev)! - 1);
    const portRet = r.reduce((a, ri, i) => a + w[i] * ri, 0);
    const benchRet = r.reduce((a, ri) => a + ri / n, 0);
    index.push(index[k - 1] * (1 + portRet));
    benchmark.push(benchmark[k - 1] * (1 + benchRet));
    dailyRet.push(portRet);
    // Drift with prices.
    w = w.map((wi, i) => wi * (1 + r[i]));
    const s = w.reduce((a, b) => a + b, 0);
    w = w.map((wi) => wi / s);

    // 2) Signals known at the close of d set the weights for the next day.
    updateEma(d);
    const isRebalance = p.rebalance === 'daily' || new Date(`${d}T00:00:00Z`).getUTCDay() === 5;
    let to = 0;
    if (isRebalance) {
      const target = clampWeights(ema.map((e) => (1 / n) * Math.exp(p.tilt * e)), p.floor, p.cap);
      const full = target.reduce((a, ti, i) => a + Math.abs(ti - w[i]), 0) / 2;
      const lambda = full > p.maxTurnover ? p.maxTurnover / full : 1;
      const moved = w.map((wi, i) => wi + lambda * (target[i] - wi));
      to = moved.reduce((a, mi, i) => a + Math.abs(mi - w[i]), 0) / 2;
      w = moved;
      rebalanceDates.push(d);
    }
    turnover.push(+to.toFixed(4));
    record();
  }

  let peak = -Infinity;
  let maxDd = 0;
  for (const v of index) { peak = Math.max(peak, v); maxDd = Math.min(maxDd, v / peak - 1); }
  const rebalTurnover = turnover.filter((_, i) => rebalanceDates.includes(dates[i]));

  return {
    tickers, dates, weights, sentiment,
    index: index.map((v) => +v.toFixed(3)),
    benchmark: benchmark.map((v) => +v.toFixed(3)),
    turnover, rebalanceDates,
    stats: {
      totalReturn: +((index[index.length - 1] / 100 - 1) * 100).toFixed(2),
      benchmarkReturn: +((benchmark[benchmark.length - 1] / 100 - 1) * 100).toFixed(2),
      volatility: +(stdev(dailyRet) * Math.sqrt(252) * 100).toFixed(2),
      maxDrawdown: +(maxDd * 100).toFixed(2),
      avgTurnover: +((rebalTurnover.reduce((a, b) => a + b, 0) / Math.max(1, rebalTurnover.length)) * 100).toFixed(2),
    },
    methodology: p,
  };
}
