import { useEffect, useMemo, useState } from 'react';
import { fmtM, post, useApi } from '../api';

const SLIDERS = [
  { k: 'equity', label: 'Equities', min: -0.4, max: 0.1, step: 0.01, fmt: (v) => `${(v * 100).toFixed(0)}%` },
  { k: 'ratesBp', label: 'Rates', min: -200, max: 400, step: 10, fmt: (v) => `${v > 0 ? '+' : ''}${v}bp` },
  { k: 'igSpreadBp', label: 'IG spreads', min: 0, max: 400, step: 10, fmt: (v) => `+${v}bp` },
  { k: 'hySpreadBp', label: 'HY spreads', min: 0, max: 1000, step: 25, fmt: (v) => `+${v}bp` },
  { k: 'oil', label: 'Oil', min: -0.5, max: 1, step: 0.05, fmt: (v) => `${(v * 100).toFixed(0)}%` },
  { k: 'eurUsd', label: 'EUR/USD', min: -0.2, max: 0.2, step: 0.01, fmt: (v) => `${(v * 100).toFixed(0)}%` },
];

/** P&L waterfall: each factor bar starts where the previous one ended; the last bar is the total. */
function Waterfall({ steps }) {
  if (!steps.length) return null;
  const lo = Math.min(0, ...steps.map((d) => d.range[0]));
  const hi = Math.max(0, ...steps.map((d) => d.range[1]));
  const span = hi - lo || 1;
  const y = (v) => `${((hi - v) / span) * 100}%`;
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'minmax(0, 1fr) auto', height: '100%', padding: '22px 14px 8px' }}>
      <div style={{ position: 'relative', display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)', gap: 14 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: y(0), borderTop: '1px dashed var(--faint)' }} />
        {steps.map((d) => (
          <div key={d.name} style={{ position: 'relative' }} title={`${d.name}: ${fmtM(d.v)}`}>
            <div style={{ position: 'absolute', left: '15%', right: '15%', top: y(d.range[1]), height: `max(2px, ${((d.range[1] - d.range[0]) / span) * 100}%)`,
              background: d.total ? (d.v < 0 ? 'var(--red)' : 'var(--up)') : d.v < 0 ? 'color-mix(in srgb, var(--down) 55%, transparent)' : 'color-mix(in srgb, var(--up) 55%, transparent)',
              boxShadow: d.total ? '0 0 18px var(--red-glow)' : 'none', transition: 'top .5s, height .5s' }} />
            <span className="num" style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 11, fontWeight: 700,
              top: `calc(${y(d.range[1])} - 17px)`, color: d.v < 0 ? 'var(--down)' : 'var(--up)' }}>
              {d.v > 0 ? '+' : ''}{d.v.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)', gap: 14, marginTop: 8 }}>
        {steps.map((d) => <span key={d.name} className="label" style={{ textAlign: 'center', color: d.total ? 'var(--amber)' : undefined }}>{d.name}</span>)}
      </div>
    </div>
  );
}

export default function StressPanel({ ctx }) {
  const scenarios = useApi('/stress/scenarios');
  const [request, setRequest] = useState(null);
  const [custom, setCustom] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Open on the event from an alert, a scenario from the command line, or the hackathon preset.
  useEffect(() => {
    if (ctx.args?.eventId) setRequest({ eventId: ctx.args.eventId });
    else setRequest({ scenarioId: ctx.args?.scenarioId ?? 'geo' });
  }, [ctx.args]);

  useEffect(() => {
    if (!request) return;
    setError(null);
    post('/stress/run', request).then((r) => { setResult(r); setCustom((c) => c ?? r.scenario.shocks); }).catch((e) => setError(e.message));
  }, [request]);

  const waterfall = useMemo(() => {
    if (!result) return [];
    let run = 0;
    const steps = Object.entries(result.byFactor).filter(([, v]) => Math.abs(v) > 0.005).map(([name, v]) => {
      const start = run; run += v;
      return { name, range: [Math.min(start, run), Math.max(start, run)], v };
    });
    return [...steps, { name: 'Total', range: [Math.min(0, run), Math.max(0, run)], v: run, total: true }];
  }, [result]);

  const cap = result?.capital;
  const scale = (x) => `${Math.min(100, (x / 16) * 100)}%`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px minmax(0, 1fr)', gap: 6, minHeight: 0 }}>
      <section className="panel">
        <div className="panel-h"><span className="t">Scenarios · Module B</span></div>
        <div className="panel-b">
          {(scenarios.data ?? []).map((s) => (
            <button key={s.id} onClick={() => setRequest({ scenarioId: s.id })}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: 10, border: 0, borderBottom: '1px solid var(--line)',
                background: result?.scenario.id === s.id ? 'var(--amber-dim)' : 'transparent', borderLeft: `2px solid ${result?.scenario.id === s.id ? 'var(--amber)' : 'transparent'}` }}>
              <div style={{ color: result?.scenario.id === s.id ? 'var(--amber)' : 'var(--text)', fontWeight: 700 }}>{s.name}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.description}</div>
              {s.trigger && <div className="chip" style={{ marginTop: 6, color: 'var(--down)', borderColor: 'color-mix(in srgb, var(--red) 35%, transparent)' }}>AUTO: {s.trigger.eventClass} ≥ {s.trigger.minImpact}</div>}
            </button>
          ))}
          {custom && (
            <div className="pad" style={{ display: 'grid', gap: 8 }}>
              <div className="label">Custom shock</div>
              {SLIDERS.map((s) => (
                <label key={s.k} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 56px', gap: 8, alignItems: 'center' }} className="muted">
                  {s.label}
                  <input type="range" min={s.min} max={s.max} step={s.step} value={custom[s.k]} style={{ accentColor: 'var(--amber)' }}
                    onChange={(e) => setCustom({ ...custom, [s.k]: +e.target.value })} />
                  <b className="amber num" style={{ textAlign: 'right' }}>{s.fmt(custom[s.k])}</b>
                </label>
              ))}
              <label style={{ display: 'grid', gridTemplateColumns: '80px 1fr 56px', gap: 8, alignItems: 'center' }} className="muted">
                PD ×
                <input type="range" min="1" max="4" step="0.1" value={custom.pdMultiplier.default} style={{ accentColor: 'var(--amber)' }}
                  onChange={(e) => setCustom({ ...custom, pdMultiplier: { ...custom.pdMultiplier, default: +e.target.value } })} />
                <b className="amber num" style={{ textAlign: 'right' }}>{custom.pdMultiplier.default.toFixed(1)}×</b>
              </label>
              <button className="btn primary" onClick={() => setRequest({ shocks: custom })}>RUN CUSTOM SHOCK</button>
            </div>
          )}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) minmax(0, 1.2fr)', gap: 6, minHeight: 0 }}>
        <section className="panel">
          <div className="panel-h">
            <span className="t">{result?.scenario.name ?? 'Stress result'}</span>
            <span className="meta">{ctx.args?.eventId && request?.eventId ? `TRIGGERED BY EVENT ${ctx.args.eventId}` : 'DEMO BANK BOOK · USD M'}</span>
          </div>
          {error && <div className="err">{error}</div>}
          {result && (
            <div className="kv">
              <div><div className="k">Value before</div><div className="v num">{fmtM(result.total.before)}</div><div className="s">all books</div></div>
              <div><div className="k">Value after</div><div className="v num">{fmtM(result.total.after)}</div><div className="s">after shock</div></div>
              <div><div className="k">Stress P&amp;L</div><div className={`v num ${result.total.pnl >= 0 ? 'up' : 'down'}`}>{fmtM(result.total.pnl)}</div><div className="s">{result.total.pnlPct}% of book</div></div>
              <div style={{ gridColumn: 'span 2' }}>
                <div className="k">CET1 ratio · min 4.5% · buffer 7.0%</div>
                <div style={{ position: 'relative', height: 26, marginTop: 6, background: 'var(--raise)' }}>
                  <div style={{ position: 'absolute', inset: 0, width: scale(cap.ratioBefore), background: 'color-mix(in srgb, var(--muted) 35%, transparent)' }} />
                  <div style={{ position: 'absolute', inset: 0, width: scale(cap.ratioAfter), background: cap.ratioAfter < 7 ? 'var(--red)' : 'var(--amber)', transition: 'width .6s' }} />
                  {[4.5, 7].map((x) => <div key={x} style={{ position: 'absolute', top: -3, bottom: -3, left: scale(x), width: 2, background: x === 4.5 ? 'var(--red)' : 'var(--ink)' }} />)}
                  <span className="num" style={{ position: 'absolute', right: 6, top: 4, fontWeight: 700 }}>{cap.ratioBefore}% → {cap.ratioAfter}%</span>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-h"><span className="t">P&amp;L by risk factor</span><span className="meta">WATERFALL · USD M</span></div>
          <div className="panel-b"><Waterfall steps={waterfall} /></div>
        </section>

        <section className="panel">
          <div className="panel-h"><span className="t">Positions</span><span className="meta">SORTED BY LOSS</span></div>
          <div className="panel-b">
            <table className="tbl">
              <thead><tr><th>ID</th><th>Position</th><th>Book</th><th>Factor</th><th>Driver</th><th className="r">Before</th><th className="r">After</th><th className="r">P&amp;L</th></tr></thead>
              <tbody>
                {(result?.positions ?? []).slice().sort((a, b) => a.pnl - b.pnl).map((p) => (
                  <tr key={p.id}>
                    <td className="faint">{p.id}</td>
                    <td>{p.name}</td>
                    <td><span className="chip">{p.book}</span></td>
                    <td className="muted">{p.factor}</td>
                    <td className="faint">{p.driver}</td>
                    <td className="r">{p.before.toFixed(1)}</td>
                    <td className="r">{p.after.toFixed(1)}</td>
                    <td className={`r ${p.pnl >= 0 ? 'up' : 'down'}`}>{p.pnl >= 0 ? '+' : ''}{p.pnl.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
