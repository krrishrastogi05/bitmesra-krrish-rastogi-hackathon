import { Request, Response } from 'express';
import { signalStore } from '../services/signalStore';
import { scenarioFor } from '../services/stressTester';

/** One summary per day of the replay window, for the timeline scrubber. */
export function getTimeline(_req: Request, res: Response): void {
  const events = signalStore.events();
  const posts = signalStore.posts();
  const days = [...new Set(events.map((e) => e.date))].sort();
  res.json(days.map((day) => {
    const ev = events.filter((e) => e.date === day).sort((a, b) => b.impact - a.impact);
    const triggers = ev
      .map((e) => ({ eventId: e.event_id, headline: e.headline, impact: e.impact, scenario: scenarioFor(e)?.id }))
      .filter((t) => t.scenario);
    return {
      date: day,
      events: ev.length,
      posts: posts.filter((p) => p.ts.startsWith(day)).length,
      avgSentiment: +(ev.reduce((a, e) => a + e.sentiment, 0) / Math.max(1, ev.length)).toFixed(3),
      maxImpact: ev[0]?.impact ?? 0,
      top: ev.slice(0, 3).map((e) => ({ eventId: e.event_id, headline: e.headline, impact: e.impact, eventClass: e.event_class })),
      triggers: triggers.slice(0, 5),
    };
  }));
}
