import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';

/** Day scrubber for the replay window. Bar height = highest impact of the day.
 *  Red = a severe trigger (impact 9+), dim red = a trigger above 7. */
export default function ReplayBar({ days, dayIdx, setDayIdx, playing, setPlaying, error }) {
  if (error) return <div className="replay"><span className="down">Replay data is not available: {error}</span></div>;
  const day = days[dayIdx];
  const step = (d) => setDayIdx(Math.max(0, Math.min(days.length - 1, dayIdx + d)));
  return (
    <div className="replay">
      <div className="replay-ctl">
        <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous day"><SkipBack size={12} /></button>
        <button className={`icon-btn${playing ? ' on' : ''}`} onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
        <button className="icon-btn" onClick={() => step(1)} aria-label="Next day"><SkipForward size={12} /></button>
      </div>
      <div className="days" role="tablist" aria-label="Replay days">
        {days.map((d, i) => (
          <button key={d.date} role="tab" aria-selected={i === dayIdx} title={`${d.date}: ${d.events} events, max impact ${d.maxImpact}`}
            className={`day${i === dayIdx ? ' on' : ''}${d.triggers.some((t) => t.impact >= 9) ? ' trig' : d.triggers.length ? ' trig-lo' : ''}`} onClick={() => setDayIdx(i)}>
            <span className="lbl num">{d.date.slice(8)}</span>
            <span className="bar" style={{ height: `${8 + d.maxImpact * 2.2}px` }} />
          </button>
        ))}
      </div>
      <div className="replay-date num">
        {day ? new Date(`${day.date}T00:00:00Z`).toUTCString().slice(0, 16).toUpperCase() : '----'}
        <small>{day ? `${day.events} EVENTS · ${day.posts} POSTS · ${day.triggers.length} TRIGGERS` : 'LOADING'}</small>
      </div>
    </div>
  );
}
