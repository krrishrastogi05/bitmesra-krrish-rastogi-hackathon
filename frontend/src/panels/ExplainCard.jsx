/** Why a signal has its score: the words that moved the sentiment and the parts of the impact score. */
export default function ExplainCard({ explain = [], parts = {}, method }) {
  const maxPart = Math.max(3, ...Object.values(parts));
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {explain.length > 0 && <div>
        <div className="label" style={{ marginBottom: 6 }}>Words that set the tone {method && <span className="faint">· class by {method}</span>}</div>
        <div className="terms">
          {explain.map((t, i) => {
            const c = t.weight > 0 ? 'var(--up)' : 'var(--down)';
            return (
              <span key={`${t.term}-${i}`} className="term-chip num" title={t.source === 'lexicon' ? 'Risk word list' : 'Model weight'}
                style={{ color: c, borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, background: `color-mix(in srgb, ${c} ${Math.min(30, Math.abs(t.weight) * 18)}%, transparent)` }}>
                {t.source === 'lexicon' ? '§ ' : ''}{t.term} {t.weight > 0 ? '+' : ''}{t.weight.toFixed(2)}
              </span>
            );
          })}
        </div>
      </div>}
      {Object.keys(parts).length > 0 && <div>
        <div className="label" style={{ marginBottom: 6 }}>Impact score parts</div>
        <div className="parts">
          {Object.entries(parts).map(([k, v]) => (
            <div className="part num" key={k}>
              <span>{k.replace('_', ' ')}</span>
              <span className="track"><span className="fill" style={{ display: 'block', width: `${(v / maxPart) * 100}%` }} /></span>
              <span style={{ textAlign: 'right', color: 'var(--text)' }}>{v.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}
