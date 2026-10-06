import assert from 'node:assert/strict';
import test from 'node:test';
import { buildIndex, clampWeights, DEFAULT_INDEX_PARAMS } from '../src/services/indexRebalancer';
import type { CompanySignal, Prices } from '../src/types/signals';

test('clampWeights keeps the sum at 1 and respects cap and floor', () => {
  const w = clampWeights([10, 1, 1, 1, 1, 1, 1, 1, 1, 1], 0.02, 0.15);
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(w.every((x) => x <= 0.15 + 1e-9 && x >= 0.02 - 1e-9));
});

test('positive sentiment raises a weight and negative sentiment lowers it', () => {
  const dates = ['2022-01-03', '2022-01-04', '2022-01-05', '2022-01-06', '2022-01-07', '2022-01-10'];
  const flat = (p: number) => dates.map((d) => [d, p] as [string, number]);
  const prices: Prices = { AAA: flat(100), BBB: flat(50), CCC: flat(20) };
  const signals: CompanySignal[] = dates.flatMap((date) => [
    { date, ticker: 'AAA', sentiment: 0.8 }, { date, ticker: 'BBB', sentiment: -0.8 }, { date, ticker: 'CCC', sentiment: 0 },
  ] as CompanySignal[]);
  const r = buildIndex(signals, prices, { ...DEFAULT_INDEX_PARAMS, cap: 0.6, floor: 0.05, maxTurnover: 1, rebalance: 'daily' });
  const last = r.dates.length - 1;
  assert.ok(r.weights.AAA[last] > r.weights.CCC[last]);
  assert.ok(r.weights.BBB[last] < r.weights.CCC[last]);
  assert.equal(r.index[last], 100); // flat prices: no return
});
