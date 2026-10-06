import { useEffect, useMemo, useState } from 'react';
import { VIEWS } from './views';

const STRESS_IDS = ['GEO', 'GEO-SEVERE', 'CREDIT', 'MACRO'];

/** Parse a Bloomberg-style command such as "AAPL SIG", "STRESS GEO" or "DAY 2022-02-24". */
export function parseCommand(raw, tickers) {
  const words = raw.trim().toUpperCase().replace(/<GO>/g, '').split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const view = VIEWS.find((v) => words.includes(v.key) || words.includes(v.label));
  const ticker = words.find((w) => tickers.includes(w));
  const date = raw.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (words[0] === 'PLAY') return { play: true };
  if (words[0] === 'STOP' || words[0] === 'PAUSE') return { play: false };
  if (words[0] === 'DAY' && date) return { day: date, view: 'MON' };
  if (view?.key === 'STRESS') {
    const id = words.find((w) => STRESS_IDS.includes(w));
    return { view: 'STRESS', args: id ? { scenarioId: id.toLowerCase() } : {} };
  }
  if (view) return { view: view.key, args: ticker ? { ticker } : {} };
  if (ticker) return { view: 'SIG', args: { ticker } };
  return null;
}

function suggestions(input, tickers) {
  const q = input.trim().toUpperCase();
  const base = [
    ...VIEWS.map((v) => ({ cmd: `${v.key} <GO>`, desc: `${v.f} · ${v.desc}` })),
    ...tickers.map((t) => ({ cmd: `${t} SIG <GO>`, desc: `Signals for ${t}` })),
    ...STRESS_IDS.map((id) => ({ cmd: `STRESS ${id} <GO>`, desc: `Run the ${id.toLowerCase()} scenario` })),
    { cmd: 'DAY 2022-02-24 <GO>', desc: 'Jump the replay to a date' },
    { cmd: 'PLAY <GO>', desc: 'Play the replay' },
    { cmd: 'STOP <GO>', desc: 'Pause the replay' },
  ];
  if (!q) return base.slice(0, 7);
  const first = q.split(/\s+/)[0];
  return base.filter((s) => s.cmd.startsWith(q) || s.cmd.includes(` ${first}`) || s.cmd.startsWith(first)).slice(0, 8);
}

export default function CommandBar({ onRun, tickers, playing }) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());
  const items = useMemo(() => suggestions(input, tickers), [input, tickers]);

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => setSel(0), [input]);

  const submit = (text) => {
    const cmd = parseCommand(text, tickers);
    if (!cmd) { setError(`Unknown command: ${text.trim()}`); return; }
    setError('');
    onRun(cmd);
    setInput('');
    setOpen(false);
    document.getElementById('cmd-input')?.blur();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Tab' && items[sel]) { e.preventDefault(); setInput(items[sel].cmd.replace(' <GO>', '')); }
    if (e.key === 'Enter') { e.preventDefault(); submit(input.trim() ? input : items[sel]?.cmd ?? ''); }
    if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); }
  };

  return (
    <header className="cmdbar">
      <div className="brand">MERIDIAN<small>RISK TERMINAL</small></div>
      <div className="cmd">
        <label className="cmd-box">
          <span className="prompt">&gt;</span>
          <input id="cmd-input" value={input} placeholder={error || 'Type a command, for example AAPL SIG or STRESS GEO   (Ctrl+K)'}
            onChange={(e) => { setInput(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKey} aria-label="Command" autoComplete="off" spellCheck={false} />
          <button className="go" onMouseDown={(e) => { e.preventDefault(); submit(input || items[sel]?.cmd || ''); }}>GO</button>
        </label>
        {open && items.length > 0 && (
          <div className="cmd-menu" role="listbox">
            {items.map((it, i) => (
              <button key={it.cmd} className={`cmd-item${i === sel ? ' on' : ''}`} onMouseDown={(e) => { e.preventDefault(); submit(it.cmd); }}>
                <b>{it.cmd}</b><span>{it.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="mode replay"><span className="dot" />{playing ? 'REPLAY ▶' : 'REPLAY'}</span>
      <span className="clock num">{now.toISOString().slice(11, 19)} UTC</span>
    </header>
  );
}
