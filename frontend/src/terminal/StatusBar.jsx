import { useEffect } from 'react';
import { useApi } from '../api';

/** Engine and service status: API, sidecar, model accuracy, build time. */
export default function StatusBar() {
  const health = useApi('/health');
  const { reload } = health;
  useEffect(() => { const id = setInterval(reload, 10_000); return () => clearInterval(id); }, [reload]);
  const pipeline = useApi('/pipeline');
  const model = useApi('/model');
  const built = pipeline.data?.generated_at?.slice(0, 16).replace('T', ' ');
  return (
    <footer className="status">
      <span className={health.data ? 'ok' : 'bad'}>● API {health.data ? 'UP' : 'DOWN'}</span>
      <span className={health.data?.sidecar === 'up' ? 'ok' : 'bad'}>● PY SIDECAR {health.data?.sidecar?.toUpperCase() ?? '—'}</span>
      <span>NLP: TF-IDF + LOGREG + RULES · NO LLM</span>
      {model.data && <span>SENT ACC {(model.data.sentiment.accuracy * 100).toFixed(1)}% · EVENT ACC {(model.data.events.accuracy * 100).toFixed(1)}%</span>}
      {built && <span style={{ marginLeft: 'auto' }}>SIGNALS BUILT {built} UTC</span>}
    </footer>
  );
}
