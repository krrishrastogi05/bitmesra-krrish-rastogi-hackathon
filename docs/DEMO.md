# Demo script (5 minutes)

This script gives the steps and the words for the live demo.
Each step has a time limit. The total time is 5 minutes.

## Before the demo

1. Start the API: `npm --prefix backend-node run dev`.
2. Start the web app: `npm --prefix frontend run dev`.
3. Open <http://localhost:5173>.
4. Make sure that the status bar shows **API UP** and **PY SIDECAR UP**.
5. On a projector, type `THEME LIGHT` in the command line. The light theme is easier to read on a projector.
6. Set the browser to full screen.

## 0:00 to 0:30. The problem

Show the start screen.

> "News moves risk before the price data does. Meridian reads news and tweets,
> gives each company and event a risk signal, and acts on it. It does not use an LLM.
> Every score shows its reason."

Click **Open terminal**.

## 0:30 to 1:30. The engine and the globe (F1)

1. Point to the globe. Each point is a GDELT news event of 17 February 2022.
2. Click the highest event in the news list. The globe moves to its location.
3. Show the explanation card: the words that set the tone and the parts of the impact score.

> "Every signal has three fields: sentiment, event class and impact.
> And every value has a reason that you can audit."

## 1:30 to 2:30. The replay and the alert

1. Click **Play** in the replay bar. The days move forward.
2. Wait for the red alert (a severe Geopolitical event, impact 9).
3. Read the headline aloud.
4. Click **RUN STRESS TEST**.

## 2:30 to 3:15. Module B: the stress test (F4)

1. Show the value before and after, and the CET1 ratio bar.
2. Show the waterfall. The rates shock causes most of the loss. The oil hedge gives some of it back.

> "One news event moved the CET1 ratio from 13.9% to 10.4%.
> The bank can see this on the day of the event, before the market moves."

## 3:15 to 3:45. Module A: the index (F3)

1. Show the index against equal weight and the weights over time.
2. Move the **TILT** slider. The chart changes.

> "Positive sentiment raises a weight, negative sentiment lowers it.
> Caps and a turnover limit keep the index stable."

## 3:45 to 4:30. The pipeline and the proof (F5, F7)

1. Press F5. Show the ten stages and their timings.
2. Type a headline in **Live scoring**. Click **SCORE**.
3. Press F7. Show the accuracy and the impact check.

> "After high-impact days, the next-day price move is 1.7 times larger.
> The baselines use past data only."

## 4:30 to 5:00. The workbench and close (F6)

1. Press F6. Click **Daily news tone (chart)**. Click **RUN**.
2. Show the chart.

> "Analysts can run their own Python on the same signals.
> Meridian: read the news, price the risk."

## If something fails

| Problem | Action |
|---|---|
| The status bar shows PY SIDECAR DOWN | Wait 30 seconds. The sidecar loads the models. Live scoring and the workbench need it. Other views work without it. |
| The globe does not show the earth | The globe textures come from unpkg.com. Make sure that the network is available, or continue with the news list. |
| The alert does not show | Make sure that **ALERTS ON** shows in the function key bar. Or type `STRESS GEO` in the command line. |
