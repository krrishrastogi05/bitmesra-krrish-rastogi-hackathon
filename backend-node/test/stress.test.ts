import assert from 'node:assert/strict';
import test from 'node:test';
import { runStress, scenarioFor, SCENARIOS } from '../src/services/stressTester';

test('the geopolitical preset loses money and the pay-fixed swap gains', () => {
  const r = runStress(SCENARIOS.find((s) => s.id === 'geo')!);
  assert.ok(r.total.pnl < 0);
  assert.ok(r.positions.find((p) => p.id === 'D1')!.pnl > 0);
  assert.ok(r.capital.ratioAfter < r.capital.ratioBefore);
});

test('a Geopolitical event triggers a shock only when impact is above 7', () => {
  assert.equal(scenarioFor({ event_class: 'Geopolitical', impact: 7 }), null);
  assert.equal(scenarioFor({ event_class: 'Geopolitical', impact: 8 })?.id, 'geo');
  assert.equal(scenarioFor({ event_class: 'Geopolitical', impact: 10 })?.id, 'geo-severe');
});
