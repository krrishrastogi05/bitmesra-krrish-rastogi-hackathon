import { useMemo } from 'react';

/** Close and day change for one ticker at a date (the last trading day on or before it). */
export function quoteAt(series, date) {
  if (!series?.length) return null;
  let i = series.length - 1;
  if (date) { i = series.findLastIndex(([d]) => d <= date); if (i < 0) return null; }
  const [d, close] = series[i];
  const prev = i > 0 ? series[i - 1][1] : close;
  return { date: d, close, change: close / prev - 1 };
}

/** Scrolling price tape for the stock universe at the replay date. */
export default function PriceTape({ prices, universe, date }) {
  const quotes = useMemo(() => Object.keys(universe ?? {}).map((t) => ({ t, q: quoteAt(prices?.[t], date) })).filter((x) => x.q), [prices, universe, date]);
  const items = quotes.map(({ t, q }) => (
    <span className="tape-item num" key={t}>
      <b>{t}</b><span>{q.close.toFixed(2)}</span>
      <span className={q.change >= 0 ? 'up' : 'down'}>{q.change >= 0 ? '▲' : '▼'} {(q.change * 100).toFixed(2)}%</span>
    </span>
  ));
  return (
    <div className="tape" aria-label="Prices">
      <div className="tape-l">S&amp;P 100 · {date ?? ''}</div>
      <div className="tape-track"><div className="tape-inner">{items}{items}</div></div>
    </div>
  );
}
