import { Siren, X } from 'lucide-react';
import { CLASS_COLOR } from '../api';

/** Full-screen red flash and alert card for an event that triggers a stress scenario (kit: argus-opsmap). */
export default function AlertFlash({ alert, onClose, onStress, onFocus }) {
  return (
    <>
      <div className="flash-overlay" />
      <div className="alert" role="alert">
        <div className="alert-l">
          <span><Siren size={12} style={{ verticalAlign: '-2px' }} /> HIGH-IMPACT EVENT · {alert.date}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Dismiss"><X size={12} /></button>
        </div>
        <div className="alert-t">{alert.headline}</div>
        <div className="alert-m">
          <span className="chip" style={{ color: CLASS_COLOR.Geopolitical, borderColor: 'rgb(255 77 79 / .4)' }}>IMPACT {alert.impact}/10</span>
          <span className="chip amber">TRIGGERS SCENARIO: {alert.scenario?.toUpperCase()}</span>
          {alert.count > 1 && <span className="chip muted">+{alert.count - 1} MORE TODAY</span>}
        </div>
        <div className="alert-actions">
          <button className="btn danger" onClick={onStress}>RUN STRESS TEST</button>
          <button className="btn" onClick={onFocus}>FOCUS ON GLOBE</button>
        </div>
      </div>
    </>
  );
}
