import MonitorPanel from '../panels/MonitorPanel';
import SignalsPanel from '../panels/SignalsPanel';
import IndexPanel from '../panels/IndexPanel';
import StressPanel from '../panels/StressPanel';

/** Function keys, command words and descriptions for each terminal view. */
export const VIEWS = [
  { key: 'MON', f: 'F1', label: 'MONITOR', desc: 'Risk globe, news tape and replay' },
  { key: 'SIG', f: 'F2', label: 'SIGNALS', desc: 'Company sentiment and impact heatmap' },
  { key: 'IDX', f: 'F3', label: 'INDEX', desc: 'Sentiment-tilted index (Module A)' },
  { key: 'STRESS', f: 'F4', label: 'STRESS', desc: 'Bank stress test (Module B)' },
  { key: 'PIPE', f: 'F5', label: 'PIPELINE', desc: 'Engine stages and live scoring' },
  { key: 'PY', f: 'F6', label: 'WORKBENCH', desc: 'Python on the signal data' },
  { key: 'MODEL', f: 'F7', label: 'MODEL', desc: 'Model accuracy and the impact check' },
];

export const PANELS = {
  MON: MonitorPanel,
  SIG: SignalsPanel,
  IDX: IndexPanel,
  STRESS: StressPanel,
};
