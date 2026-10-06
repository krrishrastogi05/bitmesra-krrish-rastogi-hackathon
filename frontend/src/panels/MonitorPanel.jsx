import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { Radio, X } from 'lucide-react';
import { CLASS_COLOR, sentColor, useApi } from '../api';
import { classHex, useTheme } from '../theme';
import { quoteAt } from '../terminal/PriceTape';
import ExplainCard from './ExplainCard';
import './monitor.css';

// Globe component and layout reused from the Datatalk FinancialGlobe; data now comes from the engine.
const IMPACT_COLOR = (i) => (i >= 8 ? 'var(--sev-hi)' : i >= 6 ? 'var(--sev-mid)' : 'var(--sev-lo)');
/** '#rrggbb' + alpha -> 'rgba(...)', for the globe rings (WebGL cannot read CSS variables). */
const withAlpha = (hex, a) => { const n = parseInt((hex || '#ef4444').slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
/** Globe look per theme: night earth on a star field, or daylight earth on a pale sky. */
const GLOBE_LOOK = {
  dark: { globe: '//unpkg.com/three-globe/example/img/earth-night.jpg', sky: '//unpkg.com/three-globe/example/img/night-sky.png', atmosphere: '#ff7a1a' },
  light: { globe: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg', sky: null, atmosphere: '#7fb2ff' },
};
const BAND = (i) => (i >= 8 ? 'high' : i >= 6 ? 'medium' : 'low');

export default function MonitorPanel({ ctx }) {
  const { day, universe, prices, args } = ctx;
  const { c, theme } = useTheme();
  const hex = classHex(c);
  const look = GLOBE_LOOK[theme];
  const events = useApi(day ? `/signals/events?date=${day.date}` : null);
  const posts = useApi(day ? `/signals/posts?date=${day.date}` : null);

  const globeRef = useRef();
  const areaRef = useRef();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [tab, setTab] = useState('NEWS');
  const [tick, setTick] = useState(0);

  const list = useMemo(() => (events.data ?? []).slice().sort((a, b) => b.impact - a.impact), [events.data]);
  const classes = useMemo(() => ['All', ...new Set(list.map((e) => e.event_class))], [list]);
  const shown = filter === 'All' ? list : list.filter((e) => e.event_class === filter);
  const pins = list.slice(0, 120);

  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 800); return () => clearInterval(id); }, []);
  useEffect(() => {
    const measure = () => { const r = areaRef.current?.getBoundingClientRect(); if (r) setSize({ w: r.width, h: r.height }); };
    measure();
    const ro = new ResizeObserver(measure);
    if (areaRef.current) ro.observe(areaRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!ready || !globeRef.current) return;
    const c = globeRef.current.controls();
    Object.assign(c, { autoRotate: true, autoRotateSpeed: 0.35, enableZoom: true, minDistance: 160, maxDistance: 520 });
    globeRef.current.pointOfView({ lat: 45, lng: 25, altitude: 2.1 }, 0);
  }, [ready]);

  const focus = useCallback((e) => {
    setSelected(e);
    if (!globeRef.current) return;
    globeRef.current.controls().autoRotate = false;
    globeRef.current.pointOfView({ lat: e.lat, lng: e.lng, altitude: 1.6 }, 900);
    setTimeout(() => { if (globeRef.current) globeRef.current.controls().autoRotate = true; }, 5000);
  }, []);

  // A new day selects nothing; an alert ("FOCUS ON GLOBE") selects its event.
  useEffect(() => { setSelected(null); }, [day?.date]);
  useEffect(() => {
    if (!args?.eventId || !list.length) return;
    const e = list.find((x) => x.event_id === args.eventId);
    if (e) setTimeout(() => focus(e), 300);
  }, [args?.eventId, list, focus]);

  const markets = Object.keys(universe).map((t) => ({ t, q: quoteAt(prices[t], day?.date) })).filter((x) => x.q);
  const bands = list.reduce((a, e) => ({ ...a, [BAND(e.impact)]: (a[BAND(e.impact)] ?? 0) + 1 }), {});
  const byClass = Object.entries(list.reduce((a, e) => ({ ...a, [e.event_class]: (a[e.event_class] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fg-overlay">
      <div className="fg-body">
        {/* LEFT: news and tweet tape */}
        <div className="fg-left-panel">
          <div className="fg-tabs">
            <button className={tab === 'NEWS' ? 'active' : ''} onClick={() => setTab('NEWS')}>NEWS · {list.length}</button>
            <button className={tab === 'TWEETS' ? 'active' : ''} onClick={() => setTab('TWEETS')}>TWEETS · {posts.data?.length ?? 0}</button>
          </div>
          {tab === 'NEWS' && (
            <>
              <div className="fg-filters">
                {classes.map((c) => (
                  <button key={c} className={`fg-filter-btn${filter === c ? ' active' : ''}`} onClick={() => setFilter(c)}>{c}</button>
                ))}
              </div>
              <div className="fg-news-list">
                {events.error && <div className="err">{events.error}</div>}
                {shown.map((e) => (
                  <div key={e.event_id} className={`fg-news-item${selected?.event_id === e.event_id ? ' selected' : ''}`} onClick={() => focus(e)}
                    style={{ borderLeftColor: selected?.event_id === e.event_id ? IMPACT_COLOR(e.impact) : undefined }}>
                    <div className="fg-news-top">
                      <span className="fg-severity-dot" style={{ background: IMPACT_COLOR(e.impact), boxShadow: e.impact >= 8 ? `0 0 ${tick % 2 ? 6 : 3}px var(--sev-hi)` : 'none' }} />
                      <span className="fg-news-category" style={{ color: CLASS_COLOR[e.event_class] }}>{e.event_class}</span>
                      <span className="fg-news-time num">IMP {e.impact} · <span style={{ color: sentColor(e.sentiment) }}>{e.sentiment > 0 ? '+' : ''}{e.sentiment.toFixed(2)}</span></span>
                    </div>
                    <div className="fg-news-headline" style={{ textTransform: 'capitalize' }}>{e.headline}</div>
                    <div className="fg-news-location">📍 {e.place}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === 'TWEETS' && (
            <div className="fg-news-list">
              {(posts.data ?? []).slice(0, 200).map((p, i) => (
                <div key={i} className="fg-news-item">
                  <div className="fg-news-top">
                    <span className="fg-news-category" style={{ color: 'var(--amber)' }}>${p.ticker}</span>
                    <span className="fg-news-category" style={{ color: CLASS_COLOR[p.event_class] }}>{p.event_class}</span>
                    <span className="fg-news-time num" style={{ color: sentColor(p.sentiment) }}>{p.sentiment > 0 ? '+' : ''}{p.sentiment.toFixed(2)}</span>
                  </div>
                  <div className="fg-news-desc" style={{ borderTop: 0, paddingTop: 0, color: 'var(--fg-muted)' }}>{p.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER: globe */}
        <div className="fg-globe-area" ref={areaRef}>
          {size.w > 0 && (
            <Globe
              ref={globeRef}
              width={size.w}
              height={size.h}
              onGlobeReady={() => setReady(true)}
              globeImageUrl={look.globe}
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundImageUrl={look.sky}
              backgroundColor={look.sky ? (c.fgGlobe || '#000000') : 'rgba(0,0,0,0)'}
              showGraticules={theme === 'light'}
              showAtmosphere
              atmosphereColor={look.atmosphere}
              atmosphereAltitude={0.13}
              pointsData={pins}
              pointLat="lat"
              pointLng="lng"
              pointColor={(d) => hex[d.event_class]}
              pointRadius={(d) => 0.18 + d.impact * 0.06 + (d.impact >= 8 && tick % 2 === 0 ? 0.12 : 0)}
              pointAltitude={(d) => 0.01 + d.impact * 0.006}
              pointResolution={10}
              pointLabel={(d) => `<div style="background:var(--fg-card);border:1px solid ${CLASS_COLOR[d.event_class]};padding:8px 12px;font-family:JetBrains Mono,monospace;max-width:280px;color:var(--fg-strong);box-shadow:0 6px 20px var(--fg-shadow)">
                <div style="color:${CLASS_COLOR[d.event_class]};font-size:10px;font-weight:700;letter-spacing:.1em">${d.event_class.toUpperCase()} · IMPACT ${d.impact}</div>
                <div style="font-size:12px;margin-top:4px;text-transform:capitalize">${d.headline}</div>
                <div style="font-size:10px;color:var(--fg-faint);margin-top:4px">📍 ${d.place}</div></div>`}
              onPointClick={focus}
              ringsData={pins.filter((e) => e.impact >= 8)}
              ringLat="lat"
              ringLng="lng"
              ringColor={() => (t) => withAlpha(c.sevHi, 1 - t)}
              ringMaxRadius={5}
              ringPropagationSpeed={2.2}
              ringRepeatPeriod={900}
              ringAltitude={0.005}
            />
          )}
          {selected && (
            <div className="fg-selected-card" style={{ maxWidth: 520 }}>
              <div className="fg-selected-top">
                <span className="fg-selected-cat" style={{ color: CLASS_COLOR[selected.event_class] }}>{selected.event_class}</span>
                <span className="fg-selected-sev" style={{ color: IMPACT_COLOR(selected.impact) }}>● IMPACT {selected.impact}/10</span>
                <button className="fg-selected-close" onClick={() => setSelected(null)} aria-label="Close"><X size={12} /></button>
              </div>
              <div className="fg-selected-headline" style={{ textTransform: 'capitalize' }}>{selected.headline}</div>
              <div className="fg-selected-meta" style={{ marginBottom: 8 }}>
                📍 {selected.place} · {selected.mentions} mentions · tone <span style={{ color: sentColor(selected.sentiment) }}>{selected.sentiment.toFixed(2)}</span>
                {selected.tickers?.length ? ` · ${selected.tickers.join(', ')}` : ''} · <a href={selected.url} target="_blank" rel="noreferrer" className="amber">source ↗</a>
              </div>
              <ExplainCard explain={selected.explain} parts={selected.impact_parts} method={selected.class_method} />
            </div>
          )}
          <div className="fg-legend">
            {Object.entries(CLASS_COLOR).map(([c, col]) => (
              <div key={c} className="fg-legend-item"><span className="fg-legend-dot" style={{ background: col }} /><span>{c}</span></div>
            ))}
          </div>
        </div>

        {/* RIGHT: markets and breakdown */}
        <div className="fg-right-panel">
          <div className="fg-panel-header"><Radio size={11} className="fg-panel-radio" /> MARKETS · {day?.date}</div>
          <div className="fg-commodities">
            {markets.map(({ t, q }) => (
              <div key={t} className="fg-commodity-row num">
                <span className="fg-commodity-label">{t}</span>
                <span className="fg-commodity-value">{q.close.toFixed(2)}</span>
                <span className={`fg-commodity-change ${q.change >= 0 ? 'up' : 'down'}`}>{q.change >= 0 ? '+' : ''}{(q.change * 100).toFixed(2)}%</span>
              </div>
            ))}
          </div>
          <div className="fg-panel-header" style={{ marginTop: 12 }}>IMPACT BANDS</div>
          <div className="fg-breakdown">
            {['high', 'medium', 'low'].map((b) => (
              <div key={b} className="fg-breakdown-row">
                <span className="fg-breakdown-dot" style={{ background: IMPACT_COLOR(b === 'high' ? 9 : b === 'medium' ? 6 : 1) }} />
                <span className="fg-breakdown-label">{b}</span>
                <div className="fg-breakdown-bar-wrap"><div className="fg-breakdown-bar" style={{ width: `${((bands[b] ?? 0) / Math.max(1, list.length)) * 100}%`, background: IMPACT_COLOR(b === 'high' ? 9 : b === 'medium' ? 6 : 1) }} /></div>
                <span className="fg-breakdown-count num">{bands[b] ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="fg-panel-header" style={{ marginTop: 12 }}>BY CLASS</div>
          <div className="fg-cat-list">
            {byClass.map(([c, n]) => (
              <div key={c} className={`fg-cat-row${filter === c ? ' active' : ''}`} onClick={() => { setFilter((f) => (f === c ? 'All' : c)); setTab('NEWS'); }}>
                <span className="fg-cat-dot" style={{ background: CLASS_COLOR[c] }} />
                <span className="fg-cat-name">{c}</span>
                <span className="fg-cat-count num">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
