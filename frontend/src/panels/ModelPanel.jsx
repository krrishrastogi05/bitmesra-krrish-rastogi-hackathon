import { useApi } from '../api';

function Confusion({ title, rep }) {
  const max = Math.max(...rep.confusion.flat());
  return (
    <section className="panel">
      <div className="panel-h"><span className="t">{title}</span><span className="meta">ROWS = TRUE · COLUMNS = PREDICTED</span></div>
      <div className="kv">
        <div><div className="k">Accuracy</div><div className="v num amber">{(rep.accuracy * 100).toFixed(1)}%</div><div className="s">{rep.valid_rows.toLocaleString()} held-out rows</div></div>
        <div><div className="k">Macro F1</div><div className="v num">{rep.macro_f1.toFixed(3)}</div><div className="s">all classes equal</div></div>
        <div><div className="k">Train rows</div><div className="v num">{rep.train_rows.toLocaleString()}</div><div className="s">{rep.dataset.split(' ')[0]}</div></div>
      </div>
      <div className="panel-b pad">
        <table className="tbl" style={{ tableLayout: 'fixed' }}>
          <thead><tr><th style={{ width: 120 }} />{rep.labels.map((l) => <th key={l} style={{ textAlign: 'center' }}>{l.slice(0, 9)}</th>)}</tr></thead>
          <tbody>
            {rep.confusion.map((row, i) => (
              <tr key={rep.labels[i]}>
                <td className="muted">{rep.labels[i]}</td>
                {row.map((v, j) => (
                  <td key={j} className="num" style={{ textAlign: 'center', fontWeight: i === j ? 700 : 400,
                    background: i === j ? `color-mix(in srgb, var(--amber) ${Math.round(10 + (v / max) * 70)}%, transparent)` : v ? `color-mix(in srgb, var(--red) ${Math.round(5 + (v / max) * 55)}%, transparent)` : 'transparent',
                    color: i === j && v / max > 0.55 ? 'var(--on-accent)' : undefined }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ModelPanel() {
  const rep = useApi('/model');
  if (rep.error) return <div className="err">{rep.error}</div>;
  if (!rep.data) return <div className="empty">Loading the model report…</div>;
  const iv = rep.data.impact_vs_returns;
  const hi = iv.avg_next_abs_return_high_impact_pct;
  const lo = iv.avg_next_abs_return_low_impact_pct;
  const ratio = hi && lo ? hi / lo : null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gridTemplateRows: 'auto minmax(0, 1fr)', gap: 6, minHeight: 0 }}>
      <section className="panel" style={{ gridColumn: '1 / -1' }}>
        <div className="panel-h"><span className="t">Does the impact score mean something?</span><span className="meta">{iv.company_days.toLocaleString()} COMPANY-DAYS · NEXT-DAY |RETURN|</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 16, padding: 14, alignItems: 'center' }}>
          <div style={{ display: 'grid', gap: 10 }}>
            {[['High impact (≥ 7)', hi, iv.high_impact_days, 'var(--red)'], ['Low impact (≤ 3)', lo, iv.low_impact_days, 'var(--muted)']].map(([label, v, n, c]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 70px', gap: 10, alignItems: 'center' }}>
                <span className="muted">{label}<br /><span className="faint">{n} days</span></span>
                <div style={{ height: 22, background: 'var(--raise)' }}><div style={{ height: '100%', width: `${(v / Math.max(hi, lo)) * 100}%`, background: c, transition: 'width .8s' }} /></div>
                <b className="num" style={{ fontSize: 16 }}>{v?.toFixed(2)}%</b>
              </div>
            ))}
          </div>
          <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 16 }}>
            <div className="label">Result</div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 700, color: 'var(--amber)' }} className="num">{ratio ? `${ratio.toFixed(1)}×` : '—'}</div>
            <div className="muted">bigger next-day moves after high-impact days. Correlation {iv.corr_impact_vs_next_abs_return}. Baselines use past days only.</div>
          </div>
        </div>
      </section>
      <Confusion title="Sentiment model · TF-IDF + logistic regression" rep={rep.data.sentiment} />
      <Confusion title="Event classifier · rules + TF-IDF" rep={rep.data.events} />
    </div>
  );
}
