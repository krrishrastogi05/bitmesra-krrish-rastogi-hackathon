import { useState } from 'react';
import { CLASS_COLOR, post, sentColor, useApi } from '../api';
import ExplainCard from './ExplainCard';

const EXAMPLES = [
  'Fitch warns Russian bond default is imminent as sanctions hit the economy',
  'Visa and Mastercard suspend operations in Russia',
  'Apple unveils new iPhone with record preorders',
  'Fed signals faster rate hikes as inflation surges',
];

export default function PipelinePanel() {
  const pipe = useApi('/pipeline');
  const [sel, setSel] = useState(null);
  const [text, setText] = useState(EXAMPLES[0]);
  const [score, setScore] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const stages = pipe.data?.stages ?? [];
  const maxMs = Math.max(1, ...stages.map((s) => s.ms));
  const active = stages.find((s) => s.name === sel) ?? stages[0];
  const sources = stages.find((s) => s.name === 'ingest')?.sources;

  const run = async () => {
    setBusy(true); setErr(null);
    try { setScore(await post('/score', { text })); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 6, minHeight: 0 }}>
      <section className="panel">
        <div className="panel-h">
          <span className="t">Engine pipeline</span>
          <span className="meta">{pipe.data ? `BUILT ${pipe.data.generated_at.slice(0, 16).replace('T', ' ')} UTC · REPLAY ${pipe.data.replay.join(' → ')}` : ''}</span>
        </div>
        {pipe.error && <div className="err">{pipe.error}</div>}
        <div className="pad" style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto' }}>
          {sources && (
            <div style={{ display: 'grid', gap: 6, alignContent: 'center', marginRight: 4 }}>
              {Object.entries(sources).map(([k, v]) => (
                <div key={k} className="chip" style={{ padding: '4px 8px', color: 'var(--cyan)', borderColor: 'color-mix(in srgb, var(--cyan) 40%, transparent)' }}>
                  {k === 'tweets' ? 'KAGGLE TWEETS' : 'GDELT NEWS'} <b className="num">{v.toLocaleString()}</b>
                </div>
              ))}
            </div>
          )}
          {stages.map((s, i) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center' }}>
              <div className="flow-link"><span className="flow-dot" style={{ animationDelay: `${i * 0.18}s` }} /></div>
              <button onClick={() => setSel(s.name)} title={s.description}
                style={{ width: 118, padding: '8px 9px', textAlign: 'left', border: `1px solid ${active?.name === s.name ? 'var(--amber)' : 'var(--line-2)'}`,
                  background: active?.name === s.name ? 'var(--amber-dim)' : 'var(--panel-2)' }}>
                <div className="label" style={{ color: 'var(--faint)' }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ color: active?.name === s.name ? 'var(--amber)' : 'var(--text)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{s.name}</div>
                <div className="num muted" style={{ fontSize: 10, marginTop: 4 }}>{s.rows_in.toLocaleString()} → {(s.rows_out ?? 0).toLocaleString()}</div>
                <div style={{ height: 3, background: 'var(--raise)', marginTop: 6 }}><div style={{ height: '100%', width: `${Math.max(3, (s.ms / maxMs) * 100)}%`, background: 'var(--amber)' }} /></div>
                <div className="num faint" style={{ fontSize: 10, marginTop: 3 }}>{s.ms >= 1000 ? `${(s.ms / 1000).toFixed(1)} s` : `${s.ms} ms`}</div>
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="flow-link"><span className="flow-dot" style={{ animationDelay: '1.9s' }} /></div>
            <div className="chip" style={{ padding: '4px 8px', color: 'var(--up)', borderColor: 'color-mix(in srgb, var(--up) 40%, transparent)' }}>API · JSON · CSV</div>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 6, minHeight: 0 }}>
        <section className="panel">
          <div className="panel-h"><span className="t">Stage · {active?.name}</span><span className="meta">{active?.description}</span></div>
          <div className="panel-b pad" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            {active && Object.entries(active).filter(([k]) => !['name', 'description', 'sample'].includes(k)).map(([k, v]) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: '110px 1fr' }}>
                <span className="label">{k.replace('_', ' ')}</span>
                <span className="num">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
            {active?.sample && (
              <>
                <div className="label">Sample</div>
                <pre style={{ margin: 0, padding: 10, background: 'var(--well)', border: '1px solid var(--line)', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                  {JSON.stringify(active.sample, null, 2)}
                </pre>
              </>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-h"><span className="t">Live scoring</span><span className="meta">THE SAME MODELS · NO LLM</span></div>
          <div className="panel-b pad" style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={500} aria-label="Text to score"
              style={{ width: '100%', resize: 'vertical', background: 'var(--well)', border: '1px solid var(--line-2)', padding: 8, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="btn primary" onClick={run} disabled={busy || text.trim().length < 3}>{busy ? 'SCORING…' : 'SCORE <GO>'}</button>
              {EXAMPLES.map((x) => <button key={x} className="btn" onClick={() => setText(x)} title={x}>{x.split(' ').slice(0, 3).join(' ')}…</button>)}
            </div>
            {err && <div className="err" style={{ margin: 0 }}>{err}</div>}
            {score && (
              <>
                <div className="kv" style={{ border: '1px solid var(--line)' }}>
                  <div><div className="k">Sentiment</div><div className="v num" style={{ color: sentColor(score.sentiment) }}>{score.sentiment > 0 ? '+' : ''}{score.sentiment.toFixed(2)}</div></div>
                  <div><div className="k">Event class</div><div className="v" style={{ fontSize: 13, color: CLASS_COLOR[score.event_class] }}>{score.event_class}</div><div className="s">by {score.class_method} · {score.class_conf}</div></div>
                  <div><div className="k">Impact</div><div className="v num amber">{score.impact}/10</div><div className="s">{score.tickers.length ? score.tickers.join(', ') : 'no linked ticker'}</div></div>
                </div>
                <ExplainCard explain={score.explain} parts={score.impact_parts} method={score.class_method} />
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
