import { useCallback, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { keymap } from '@codemirror/view';
import { post } from '../api';

const SNIPPETS = {
  'Impact leaders': `# Which stocks had the strongest signals?
result = (signals.groupby("ticker")
          .agg(avg_sentiment=("sentiment", "mean"), max_impact=("impact", "max"), posts=("posts", "sum"))
          .sort_values("max_impact", ascending=False))
print(f"{len(signals)} company-days, {signals.ticker.nunique()} tickers")`,
  'Geopolitical map by country': `# Where did the geopolitical news come from in the replay window?
geo = events[events.event_class == "Geopolitical"]
result = (geo.groupby("country")
          .agg(events=("event_id", "count"), avg_impact=("impact", "mean"), avg_tone=("sentiment", "mean"))
          .sort_values("events", ascending=False).head(12))
print(f"{len(geo)} geopolitical events of {len(events)}")`,
  'Does impact predict moves? (chart)': `# Next-day absolute return by impact score
px = prices.sort_values(["ticker", "date"]).copy()
px["next_abs"] = px.groupby("ticker")["close"].pct_change().shift(-1).abs() * 100
m = signals.merge(px, on=["date", "ticker"]).dropna(subset=["next_abs"])
result = m.groupby("impact")["next_abs"].agg(["mean", "count"]).round(2)
ax = result["mean"].plot(kind="bar", color="#ffb020", figsize=(7, 3.2))
ax.set_xlabel("impact score"); ax.set_ylabel("avg next-day |return| %")
plt.title("Higher impact, bigger next-day moves"); plt.tight_layout(); plt.show()`,
  'Daily news tone (chart)': `# Average tone and volume of news per day
daily = events.groupby("date").agg(tone=("sentiment", "mean"), n=("event_id", "count"), high=("impact", lambda s: (s >= 8).sum()))
fig, ax = plt.subplots(figsize=(7, 3.2))
ax.bar(daily.index, daily["high"], color="#ff4d4f", alpha=.5, label="impact >= 8")
ax2 = ax.twinx(); ax2.plot(daily.index, daily["tone"], color="#ffb020", marker="o", label="avg tone")
ax.set_xticks(range(len(daily))); ax.set_xticklabels([d[5:] for d in daily.index], rotation=60, fontsize=7)
plt.title("Russia-Ukraine: tone falls as high-impact events rise"); plt.tight_layout(); plt.show()
result = daily`,
  'Custom risk factor': `# Build your own factor: negative tone x abnormal attention
s = signals.copy()
s["my_risk"] = (-s["sentiment"]).clip(lower=0) * s["attention"]
result = s.sort_values("my_risk", ascending=False)[["date", "ticker", "sentiment", "attention", "impact", "my_risk"]].head(15)`,
};

export default function WorkbenchPanel() {
  const [code, setCode] = useState(SNIPPETS['Impact leaders']);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const run = useCallback(async () => {
    setBusy(true); setErr(null);
    try { setOut(await post('/workbench/run', { code })); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [code]);

  const runKey = keymap.of([{ key: 'Mod-Enter', run: () => { run(); return true; } }]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 6, minHeight: 0 }}>
      <section className="panel">
        <div className="panel-h">
          <span className="t">Python workbench</span>
          <span className="meta">SANDBOX · 30 S LIMIT · CTRL+ENTER TO RUN</span>
        </div>
        <div className="pad" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--line)' }}>
          {Object.keys(SNIPPETS).map((k) => <button key={k} className="btn" onClick={() => setCode(SNIPPETS[k])}>{k}</button>)}
        </div>
        <div className="panel-b" style={{ background: '#000' }}>
          <CodeMirror value={code} onChange={setCode} theme="dark" height="100%" style={{ height: '100%', fontSize: 12 }}
            extensions={[python(), runKey]} basicSetup={{ foldGutter: false }} aria-label="Python code" />
        </div>
        <div className="pad" style={{ display: 'flex', gap: 10, alignItems: 'center', borderTop: '1px solid var(--line)' }}>
          <button className="btn primary" onClick={run} disabled={busy}>{busy ? 'RUNNING…' : 'RUN <GO>'}</button>
          <span className="faint">Names: <span className="amber">signals</span> (company-days), <span className="amber">events</span> (news), <span className="amber">posts</span>, <span className="amber">prices</span>, <span className="amber">universe</span>, pd, np, plt. Assign a DataFrame to <span className="amber">result</span> to see a table.</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h"><span className="t">Output</span><span className="meta">{out ? `${out.success ? 'OK' : 'ERROR'} · ${out.ms} MS` : ''}</span></div>
        <div className="panel-b pad" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          {err && <div className="err" style={{ margin: 0 }}>{err}</div>}
          {!out && !err && <div className="empty">Pick a snippet or write code, then press RUN.</div>}
          {out?.error && <pre className="err" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{out.error}</pre>}
          {out?.stdout && <pre style={{ margin: 0, padding: 10, background: '#000', border: '1px solid var(--line)', whiteSpace: 'pre-wrap' }}>{out.stdout}</pre>}
          {out?.figures?.map((f, i) => <img key={i} alt="Chart from the workbench" src={`data:image/png;base64,${f}`} style={{ maxWidth: '100%', border: '1px solid var(--line)' }} />)}
          {out?.table && (
            <div style={{ overflow: 'auto', border: '1px solid var(--line)', maxHeight: 420 }}>
              <table className="tbl">
                <thead><tr>{out.table.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {out.table.rows.map((row, i) => (
                    <tr key={i}>{row.map((v, j) => <td key={j} className={typeof v === 'number' ? 'r' : ''}>{typeof v === 'number' ? +v.toFixed(4) : String(v)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              {out.table.total_rows > out.table.rows.length && <div className="faint pad">Showing {out.table.rows.length} of {out.table.total_rows} rows.</div>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
