import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '../api';
import { VIEWS, PANELS } from './views';
import CommandBar from './CommandBar';
import ReplayBar from './ReplayBar';
import PriceTape from './PriceTape';
import StatusBar from './StatusBar';
import AlertFlash from './AlertFlash';

const PLAY_MS = 4500;
export const SEVERE = 9;

/** The terminal shell. Holds the active view, the replay day and the trigger alert. */
export default function Terminal() {
  const timeline = useApi('/replay/timeline');
  const universe = useApi('/universe');
  const prices = useApi('/prices');

  const [view, setView] = useState('MON');
  const [args, setArgs] = useState({});          // view arguments, for example { ticker } or { eventId }
  const [dayIdx, setDayIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [alert, setAlert] = useState(null);
  const [alertsOn, setAlertsOn] = useState(true);

  const days = timeline.data ?? [];
  const day = days[dayIdx];

  const open = useCallback((v, a = {}) => { setView(v); setArgs(a); }, []);

  // Replay clock: one day every PLAY_MS. Stop on the last day.
  useEffect(() => {
    if (!playing || !days.length) return undefined;
    if (dayIdx >= days.length - 1) { setPlaying(false); return undefined; }
    const id = setTimeout(() => setDayIdx((i) => Math.min(i + 1, days.length - 1)), PLAY_MS);
    return () => clearTimeout(id);
  }, [playing, dayIdx, days.length]);

  // Module B triggers on impact above 7. During replay, the full alert fires only on severe days
  // (a trigger with impact 9 or more), so that it keeps its meaning.
  useEffect(() => {
    const top = day?.triggers?.find((t) => t.impact >= SEVERE);
    if (!alertsOn || !playing || !top) return;
    setAlert({ ...top, date: day.date, count: day.triggers.length });
  }, [day, alertsOn, playing]);

  // F1..F7 open the views. Ctrl+K or "/" focuses the command line.
  useEffect(() => {
    const onKey = (e) => {
      const v = VIEWS.find((x) => x.f === e.key);
      if (v) { e.preventDefault(); open(v.key); }
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && !document.activeElement?.closest?.('.cm-editor'))) {
        e.preventDefault();
        document.getElementById('cmd-input')?.focus();
      }
      if (e.key === 'Escape') setAlert(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const run = useCallback((cmd) => {
    if (cmd.view) open(cmd.view, cmd.args);
    if (cmd.day) { const i = days.findIndex((d) => d.date === cmd.day); if (i >= 0) setDayIdx(i); }
    if (cmd.play !== undefined) setPlaying(cmd.play);
  }, [days, open]);

  const ctx = useMemo(() => ({
    day, days, dayIdx, setDayIdx, universe: universe.data ?? {}, prices: prices.data ?? {}, args, open,
  }), [day, days, dayIdx, universe.data, prices.data, args, open]);

  const Panel = PANELS[view];

  return (
    <div className="term">
      <CommandBar onRun={run} tickers={Object.keys(universe.data ?? {})} playing={playing} />
      <nav className="fkeys" aria-label="Views">
        {VIEWS.map((v) => (
          <button key={v.key} className={`fkey${view === v.key ? ' on' : ''}`} onClick={() => open(v.key)} title={v.desc}>
            <kbd>{v.f}</kbd>{v.label}
          </button>
        ))}
        <button className={`fkey${alertsOn ? '' : ' faint'}`} style={{ marginLeft: 'auto' }} onClick={() => setAlertsOn((x) => !x)}>
          ALERTS {alertsOn ? 'ON' : 'OFF'}
        </button>
      </nav>
      <ReplayBar days={days} dayIdx={dayIdx} setDayIdx={setDayIdx} playing={playing} setPlaying={setPlaying} error={timeline.error} />
      <main className="workspace">{Panel ? <Panel ctx={ctx} /> : null}</main>
      <PriceTape prices={prices.data} universe={universe.data} date={day?.date} />
      <StatusBar />
      {alert && (
        <AlertFlash alert={alert} onClose={() => setAlert(null)}
          onStress={() => { open('STRESS', { eventId: alert.eventId }); setAlert(null); setPlaying(false); }}
          onFocus={() => { open('MON', { eventId: alert.eventId }); setAlert(null); setPlaying(false); }} />
      )}
    </div>
  );
}
