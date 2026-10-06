import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const repoRoot = path.join(__dirname, '../..');

export const config = {
  port: parseInt(process.env.PORT ?? '8080', 10),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE ?? '120', 10),
  sidecarUrl: process.env.SIDECAR_URL ?? 'http://127.0.0.1:8090',
  /** Folder where the Python engine writes signals.json, prices.json and the reports. */
  dataDir: process.env.DATA_DIR ?? path.join(repoRoot, 'data'),
  repoRoot,
};
