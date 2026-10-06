import { Request, Response } from 'express';
import { z } from 'zod';
import { runWorkbench, scoreText } from '../utils/sidecarClient';

const scoreBody = z.object({ text: z.string().trim().min(3).max(500) });
const runBody = z.object({ code: z.string().min(1).max(8000) });

/** Score one piece of text with the live engine models. */
export async function postScore(req: Request, res: Response): Promise<void> {
  res.json(await scoreText(scoreBody.parse(req.body).text));
}

/** Run analyst Python in the sidecar sandbox, with the signals loaded as DataFrames. */
export async function postRun(req: Request, res: Response): Promise<void> {
  res.json(await runWorkbench(runBody.parse(req.body).code));
}
