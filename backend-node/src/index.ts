import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import app, { logger } from './app';
import { config } from './config';
import { sidecarHealth } from './utils/sidecarClient';

let sidecarProcess: ChildProcess | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Starts the Python sidecar (NLP scoring + workbench sandbox) if it is not already running.
 *  The API still serves stored signals when the sidecar is down; only live scoring and the
 *  workbench stop. */
async function ensureSidecar(): Promise<void> {
  if (await sidecarHealth()) {
    logger.info('Sidecar already running');
    return;
  }
  const sidecarDir = path.join(config.repoRoot, 'sidecar');
  const venvPython = process.platform === 'win32'
    ? path.join(sidecarDir, 'venv', 'Scripts', 'python.exe')
    : path.join(sidecarDir, 'venv', 'bin', 'python');
  const python = fs.existsSync(venvPython) ? venvPython : 'python';

  sidecarProcess = spawn(python, ['main.py'], { cwd: sidecarDir, stdio: 'ignore' });
  sidecarProcess.on('error', (err) => logger.error(err, 'Failed to start sidecar'));
  sidecarProcess.unref();

  for (let i = 0; i < 20; i++) {
    await sleep(500);
    if (await sidecarHealth()) {
      logger.info('Sidecar started');
      return;
    }
  }
  logger.warn('Sidecar did not report healthy within 10s; live scoring and the workbench are off.');
}

async function main(): Promise<void> {
  await ensureSidecar();
  const server = app.listen(config.port, () => logger.info(`Meridian API listening on port ${config.port}`));

  const shutdown = (): void => {
    sidecarProcess?.kill();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error(err, 'Fatal startup error');
  process.exit(1);
});
