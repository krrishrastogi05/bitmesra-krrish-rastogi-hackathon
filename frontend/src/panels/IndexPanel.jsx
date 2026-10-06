import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApi } from '../api';
import { useTheme } from '../theme';

const PERIODS = { 'FULL YEAR': ['2021-10-01', '2022-09-29'], '2022 H1': ['2022-01-03', '2022-06-30'], 'CRISIS ±1M': ['2022-01-18', '2022-04-08'] };
/** One colour per stock. The light palette uses darker shades so that thin areas stay visible on white. */
const PALETTE = {
  dark: ['#ffb020', '#22d3ee', '#a78bfa', '#2fd47c', '#ff5a5f', '#f472b6', '#60a5fa', '#facc15', '#34d399', '#fb923c', '#c084fc', '#38bdf8', '#e879f9', '#4ade80', '#f87171', '#94a3b8'],
  light: ['#b45309', '#0e7490', '#6d28d9', '#047857', '#dc2626', '#be185d', '#2563eb', '#a16207', '#0f766e', '#c2410c', '#7e22ce', '#0369a1', '#a21caf', '#15803d', '#b91c1c', '#475569'],
};

export default function IndexPanel({ ctx }) {
  const { day, days } = ctx;
  const { c, theme } = useTheme();
  const palette = PALETTE[theme];
  const axis = { stroke: c.faint, fontSize: 10, fontFamily: 'JetBrains Mono' };
  const tip = { contentStyle: { background: c.panel, border: `1px solid ${c.line2}`, color: c.text, fontFamily: 'JetBrains Mono', fontSize: 11 }, labelStyle: { color: c.amber } };
  const [period, setPeriod] = useState('FULL YEAR');
  const [tilt, setTilt] = useState(2.5);
  const [tiltQ, setTiltQ] = useState(2.5);
  const [cap, setCap] = useState(0.15);
  const [turnover, setTurnover] = useState(0.2);
  const [rebalance, setRebalance] = useState('weekly');
  useEffect(() => { const id = setTimeout(() => setTiltQ(tilt), 250); return () => clearTimeout(id); }, [tilt]);

  const [from, to] = PERIODS[period];
  const res = useApi(`/index?from=${from}&to=${to}&tilt=${tiltQ}&cap=${cap}&maxTurnover=${turnover}&rebalance=${rebalance}`);
  const r = res.data;

  const rows = useMemo(() => r?.dates.map((d, i) => ({
    date: d, index: r.index[i], benchmark: r.benchmark[i],
    ...Object.fromEntries(r.tickers.map((t) => [t, r.weights[t][i]])),
  })) ?? [], [r]);
  const crisis = [days[0]?.date, days[days.length - 1]?.date];
  const spread = r ? r.stats.totalReturn - r.stats.benchmarkReturn : 0;

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) minmax(0, 1fr)', gap: 6, minHeight: 0 }}>
      <section className="panel">
        <div className="panel-h">
          <span className="t">Sentiment-tilted index · Module A</span>
          <span className="meta">{r ? `${r.tickers.length} S&P 100 STOCKS · ${r.rebalanceDates.length} REBALANCES` : ''}</span>
        </div>
        <div className="pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <div className="seg">{Object.keys(PERIODS).map((p) => <button key={p} className={period === p ? 'on' : ''} onClick={() => setPeriod(p)}>{p}</button>)}</div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="muted">
            TILT <input type="range" min="0" max="6" step="0.5" value={tilt} onChange={(e) => setTilt(+e.target.value)} style={{ accentColor: 'var(--amber)' }} />
            <b className="amber num" style={{ width: 28 }}>{tilt.toFixed(1)}</b>
          </label>
          <div className="seg" title="Max weight per stock">{[0.1, 0.15, 0.2, 0.3].map((c) => <button key={c} className={cap === c ? 'on' : ''} onClick={() => setCap(c)}>CAP {c * 100}%</button>)}</div>
          <div className="seg" title="Max one-way turnover per rebalance">{[0.1, 0.2, 0.5, 1].map((t) => <button key={t} className={turnover === t ? 'on' : ''} onClick={() => setTurnover(t)}>TO {t * 100}%</button>)}</div>
          <div className="seg">{['daily', 'weekly'].map((x) => <button key={x} className={rebalance === x ? 'on' : ''} onClick={() => setRebalance(x)}>{x.toUpperCase()}</button>)}</div>
        </div>
        {res.error && <div className="err">{res.error}</div>}
        {r && (
          <div className="kv">
            <div><div className="k">Tilted index</div><div className={`v num ${r.stats.totalReturn >= 0 ? 'up' : 'down'}`}>{r.stats.totalReturn > 0 ? '+' : ''}{r.stats.totalReturn}%</div><div className="s">total return</div></div>
            <div><div className="k">Equal weight</div><div className={`v num ${r.stats.benchmarkReturn >= 0 ? 'up' : 'down'}`}>{r.stats.benchmarkReturn > 0 ? '+' : ''}{r.stats.benchmarkReturn}%</div><div className="s">benchmark</div></div>
            <div><div className="k">Active return</div><div className={`v num ${spread >= 0 ? 'up' : 'down'}`}>{spread > 0 ? '+' : ''}{spread.toFixed(2)}%</div><div className="s">tilted − benchmark</div></div>
            <div><div className="k">Volatility</div><div className="v num">{r.stats.volatility}%</div><div className="s">annualised</div></div>
            <div><div className="k">Max drawdown</div><div className="v num down">{r.stats.maxDrawdown}%</div><div className="s">peak to trough</div></div>
            <div><div className="k">Avg turnover</div><div className="v num">{r.stats.avgTurnover}%</div><div className="s">per rebalance</div></div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-h"><span className="t">Index value vs equal weight</span><span className="meta">BASE 100 · SHADE = REPLAY WINDOW</span></div>
        <div className="panel-b" style={{ padding: '8px 8px 0' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid stroke={c.line} strokeDasharray="2 4" />
              <XAxis dataKey="date" {...axis} tick={axis} minTickGap={40} />
              <YAxis {...axis} tick={axis} domain={['auto', 'auto']} width={44} />
              <Tooltip {...tip} />
              {crisis[0] && <ReferenceArea x1={crisis[0]} x2={crisis[1]} fill={c.red} fillOpacity={0.07} />}
              {day && <ReferenceLine x={day.date} stroke={c.amber} strokeDasharray="3 3" />}
              <Line type="monotone" dataKey="index" name="Tilted" stroke={c.amber} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="benchmark" name="Equal weight" stroke={c.muted} strokeWidth={1.4} dot={false} strokeDasharray="4 3" />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><span className="t">Weights over time</span><span className="meta">CAP {cap * 100}% · FLOOR 2% · TURNOVER LIMIT {turnover * 100}%</span></div>
        <div className="panel-b" style={{ padding: '8px 8px 0' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} stackOffset="expand">
              <XAxis dataKey="date" {...axis} tick={axis} minTickGap={40} />
              <YAxis {...axis} tick={axis} tickFormatter={(v) => `${Math.round(v * 100)}%`} width={44} />
              <Tooltip {...tip} formatter={(v) => `${(v * 100).toFixed(1)}%`} />
              {day && <ReferenceLine x={day.date} stroke={c.amber} strokeDasharray="3 3" />}
              {r?.tickers.map((t, i) => (
                <Area key={t} type="stepAfter" dataKey={t} stackId="w" stroke={palette[i % palette.length]} fill={palette[i % palette.length]} fillOpacity={0.55} strokeWidth={0.6} isAnimationActive={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
