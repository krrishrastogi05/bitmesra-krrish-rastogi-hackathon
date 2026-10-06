import { Request, Response } from 'express';
import { sidecarHealth } from '../utils/sidecarClient';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  res.json({ status: 'ok', sidecar: (await sidecarHealth()) ? 'up' : 'down' });
}
