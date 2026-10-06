import { Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler';
import { CAPITAL, PORTFOLIO } from '../services/portfolio';
import { signalStore } from '../services/signalStore';
import { runStress, scenarioFor, SCENARIOS, type Scenario } from '../services/stressTester';

const shocks = z.object({
  equity: z.number().min(-0.9).max(0.9),
  ratesBp: z.number().min(-500).max(1000),
  igSpreadBp: z.number().min(-200).max(1500),
  hySpreadBp: z.number().min(-300).max(3000),
  oil: z.number().min(-0.9).max(3),
  eurUsd: z.number().min(-0.5).max(0.5),
  pdMultiplier: z.object({ default: z.number().min(0).max(20) }).catchall(z.number().min(0).max(20)),
});
const runBody = z.union([
  z.object({ scenarioId: z.string().max(40) }),
  z.object({ eventId: z.string().max(40) }),
  z.object({ shocks }),
]);

export function getPortfolio(_req: Request, res: Response): void {
  res.json({ positions: PORTFOLIO, capital: CAPITAL });
}

export function getScenarios(_req: Request, res: Response): void {
  res.json(SCENARIOS);
}

/** Run a preset scenario, the scenario that an event triggers, or custom shocks. */
export function runScenario(req: Request, res: Response): void {
  const body = runBody.parse(req.body);
  let scenario: Scenario | undefined;
  if ('scenarioId' in body) scenario = SCENARIOS.find((s) => s.id === body.scenarioId);
  if ('eventId' in body) {
    const event = signalStore.events().find((e) => e.event_id === body.eventId);
    if (!event) throw new HttpError(404, 'Event not found');
    scenario = scenarioFor(event) ?? undefined;
    if (!scenario) throw new HttpError(422, `This event (${event.event_class}, impact ${event.impact}) does not trigger a preset scenario.`);
  }
  if ('shocks' in body) {
    scenario = { id: 'custom', name: 'Custom shock', description: 'Shocks set by the user.', trigger: null, shocks: body.shocks };
  }
  if (!scenario) throw new HttpError(404, 'Scenario not found');
  res.json(runStress(scenario));
}
