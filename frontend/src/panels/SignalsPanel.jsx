import { useEffect, useMemo, useState } from 'react';
import { CLASS_COLOR, sentColor, useApi } from '../api';
import ExplainCard from './ExplainCard';

/** Sentiment as a red-to-green colour. */
const heat = (s) => {
  const a = Math.min(1, Math.abs(s) * 1.6);
  return s >= 0 ? `rgb(47 212 124 / ${0.08 + a * 0.75})` : `rgb(255 90 95 / ${0.08 + a * 0.75})`;
};

export default function SignalsPanel({ ctx }) {
  const { days, day, universe, args, setDayIdx } = ctx;
  const from = days[0]?.date;
  const to = days[days.length - 1]?.date;
  const data = useApi(from ? `/signals/companies?from=${from}&to=${to}` : null);
  const tickers = Object.keys(universe);
  const [sel, setSel] = useState({ ticker: args?.ticker ?? tickers[0], date: day?.date });

  useEffect(() => { if (args?.ticker) setSel((s) => ({ ...s, ticker: args.ticker })); }, [args?.ticker]);
  useEffect(() => { if (day) setSel((s) => ({ ...s, date: day.date })); }, [day?.date]);

  const cell = useMemo(() => new Map((data.data ?? []).map((s) => [`${s.ticker}|${s.date}`, s])), [data.data]);
  const dates = days.map((d) => d.date);
  const rows = tickers.map((t) => {
    const sigs = dates.map((d) => cell.get(`${t}|${d}`)).filter(Boolean);
    return {
      t,
      avg: sigs.reduce((a, s) => a + s.sentiment, 0) / Math.max(1, sigs.length),
      maxImpact: Math.max(0, ...sigs.map((s) => s.impact)),
      posts: sigs.reduce((a, s) => a + s.posts, 0),
    };
  });
  const current = cell.get(`${sel.ticker ?? tickers[0]}|${sel.date}`);
  const ticker = sel.ticker ?? tickers[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: 6, minHeight: 0 }}>
      <section className="panel">
        <div className="panel-h"><span className="t">Company signals</span><span className="meta">COLOUR = SENTIMENT · BORDER = IMPACT · CLICK A CELL</span></div>
        <div className="panel-b">
          {data.error && <div className="err">{data.error}</div>}
          <table className="tbl" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: 70 }}>Ticker</th>
                {dates.map((d) => <th key={d} style={{ textAlign: 'center', padding: '5px 0', color: d === day?.date ? 'var(--amber)' : undefined }}>{d.slice(8)}</th>)}
                <th className="r" style={{ width: 64 }}>Avg</th>
                <th className="r" style={{ width: 56 }}>Max</th>
                <th className="r" style={{ width: 64 }}>Posts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.t}>
                  <td style={{ color: r.t === ticker ? 'var(--amber)' : undefined, fontWeight: r.t === ticker ? 700 : 400 }}>{r.t}</td>
                  {dates.map((d, i) => {
                    const s = cell.get(`${r.t}|${d}`);
                    const on = r.t === ticker && d === sel.date;
                    return (
                      <td key={d} style={{ padding: 2 }}>
                        <button title={s ? `${r.t} ${d}: sentiment ${s.sentiment}, impact ${s.impact}, ${s.posts} posts` : `${r.t} ${d}: no posts`}
                          onClick={() => { setSel({ ticker: r.t, date: d }); setDayIdx(i); }}
                          style={{
                            width: '100%', height: 22, border: on ? '1px solid var(--amber)' : `1px solid rgb(255 176 32 / ${s ? (s.impact - 1) / 9 : 0})`,
                            background: s ? heat(s.sentiment) : 'var(--panel-2)', fontSize: 9, color: s && s.impact >= 6 ? '#fff' : 'transparent',
                          }}>{s?.impact}</button>
                      </td>
                    );
                  })}
                  <td className="r" style={{ color: sentColor(r.avg) }}>{r.avg.toFixed(2)}</td>
                  <td className="r">{r.maxImpact || '—'}</td>
                  <td className="r muted">{r.posts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><span className="t">{ticker} · {universe[ticker]?.name}</span><span className="meta">{sel.date}</span></div>
        <div className="panel-b">
          {!current && <div className="empty">No posts for {ticker} on {sel.date}.</div>}
          {current && (
            <>
              <div className="kv">
                <div><div className="k">Sentiment</div><div className="v num" style={{ color: sentColor(current.sentiment) }}>{current.sentiment > 0 ? '+' : ''}{current.sentiment.toFixed(2)}</div><div className="s">-1.0 to 1.0</div></div>
                <div><div className="k">Impact</div><div className="v num amber">{current.impact}/10</div><div className="s">{current.attention}× normal attention</div></div>
                <div><div className="k">Event class</div><div className="v" style={{ fontSize: 13, color: CLASS_COLOR[current.event_class] }}>{current.event_class}</div><div className="s">{current.posts} posts</div></div>
              </div>
              <div className="pad"><ExplainCard explain={[]} parts={current.impact_parts} /></div>
              <div className="pad" style={{ display: 'grid', gap: 10 }}>
                <div className="label">Strongest posts</div>
                {(current.top ?? []).map((p, i) => (
                  <div key={i} style={{ border: '1px solid var(--line)', padding: 10, display: 'grid', gap: 8 }}>
                    <div style={{ color: '#c9d1db' }}>{p.text}</div>
                    <div className="num" style={{ color: sentColor(p.sentiment) }}>sentiment {p.sentiment > 0 ? '+' : ''}{p.sentiment.toFixed(2)}</div>
                    <ExplainCard explain={p.explain} parts={{}} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
