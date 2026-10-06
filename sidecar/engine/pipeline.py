"""Run the full engine and write the signal files.

    python -m engine.pipeline            # use cached models if present
    python -m engine.pipeline --retrain  # train the models again

Outputs (data/signals/):
    company_daily.json  one record per company per day: sentiment, event_class, impact
    events.json         one record per news event (GDELT) in the replay window, with geo + explanation
    posts.json          scored tweets for the universe in the replay window, with explanation
    prices.json         daily close per ticker
    universe.json       ticker -> name, sector
    pipeline.json       stage metrics: rows in/out, time, one sample input and output per stage
    model_report.json   validation metrics for both models + impact vs next-day price move
"""
import json
import sys
import time
from contextlib import contextmanager

import joblib
import numpy as np
import pandas as pd

from . import events, sentiment, sources
from .config import MODELS, OUT, REPLAY_END, REPLAY_START, UNIVERSE
from .impact import company_impact, is_market_relevant, news_impact
from .preprocess import cashtags, clean

STAGES: list[dict] = []


@contextmanager
def stage(name: str, description: str, rows_in: int):
    """Time one pipeline stage and record its metrics."""
    rec = {"name": name, "description": description, "rows_in": rows_in}
    t0 = time.perf_counter()
    yield rec
    rec["ms"] = round((time.perf_counter() - t0) * 1000, 1)
    STAGES.append(rec)
    print(f"  {name:<10} {rec['rows_in']:>7} -> {rec.get('rows_out', '-'):>7}  {rec['ms']:>9.1f} ms")


def load_models(retrain: bool) -> tuple:
    MODELS.mkdir(parents=True, exist_ok=True)
    sp, ep, rp = MODELS / "sentiment.joblib", MODELS / "events.joblib", MODELS / "report.json"
    if not retrain and sp.exists() and ep.exists() and rp.exists():
        return joblib.load(sp), joblib.load(ep), json.loads(rp.read_text())
    s_model, s_rep = sentiment.train(sources.load_labelled("sent_train"), sources.load_labelled("sent_valid"))
    e_model, e_rep = events.train(sources.load_labelled("topic_train"), sources.load_labelled("topic_valid"))
    joblib.dump(s_model, sp)
    joblib.dump(e_model, ep)
    report = {"sentiment": s_rep, "events": e_rep}
    rp.write_text(json.dumps(report, indent=2))
    return s_model, e_model, report


def news_tickers(headline: str) -> list[str]:
    words = f" {headline} "
    return [t for t, (_, _, aliases) in UNIVERSE.items() if any(f" {a.replace('-', ' ')} " in words for a in aliases)]


def run(retrain: bool = False) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    days = pd.date_range(REPLAY_START, REPLAY_END).strftime("%Y-%m-%d").tolist()

    with stage("models", "Load or train the sentiment and event models", 0) as s:
        s_model, e_model, report = load_models(retrain)
        s["rows_out"] = 2
        s["sample"] = {"sentiment_accuracy": report["sentiment"]["accuracy"], "event_accuracy": report["events"]["accuracy"]}

    with stage("ingest", "Read Kaggle stock tweets and GDELT news events", 0) as s:
        tweets = sources.load_tweets()
        tweets = tweets[tweets["ticker"].isin(UNIVERSE)].reset_index(drop=True)
        news = pd.concat([sources.load_gdelt_day(d) for d in days], ignore_index=True)
        s["rows_out"] = len(tweets) + len(news)
        s["sources"] = {"tweets": len(tweets), "gdelt_news": len(news)}
        s["sample"] = {"tweet": tweets.iloc[0]["text"][:160], "news_url": news.iloc[0]["url"]}

    with stage("clean", "Fix encoding, strip URLs and mentions, drop duplicates", len(tweets) + len(news)) as s:
        raw_example = tweets.iloc[0]["text"]
        tweets["clean"] = tweets["text"].map(clean)
        tweets = tweets.drop_duplicates(["ticker", "clean"]).reset_index(drop=True)
        news["clean"] = news["headline"].map(clean)
        news = news.drop_duplicates("clean").reset_index(drop=True)
        s["rows_out"] = len(tweets) + len(news)
        s["sample"] = {"in": raw_example[:160], "out": clean(raw_example)[:160]}

    with stage("entities", "Link text to tickers (cashtags, company names) and places", len(tweets) + len(news)) as s:
        tweets["tickers"] = [sorted({tk} | (cashtags(tx) & set(UNIVERSE))) for tk, tx in zip(tweets["ticker"], tweets["text"])]
        news["tickers"] = news["clean"].map(news_tickers)
        s["rows_out"] = len(tweets) + len(news)
        s["linked_news"] = int(news["tickers"].map(bool).sum())
        s["sample"] = {"in": news.iloc[0]["headline"], "out": {"place": news.iloc[0]["place"], "tickers": news.iloc[0]["tickers"]}}

    with stage("sentiment", "Score tone from -1 to 1 (TF-IDF + logistic regression)", len(tweets) + len(news)) as s:
        tweets["sentiment"] = sentiment.score(s_model, tweets["text"].tolist()).round(3)
        model_tone = sentiment.score(s_model, news["headline"].tolist())
        gdelt_tone = np.clip(news["tone"].fillna(0) / 10, -1, 1)
        news["sentiment"] = (0.7 * model_tone + 0.3 * gdelt_tone).round(3)  # blend the model with GDELT's own tone
        s["rows_out"] = len(tweets) + len(news)
        s["sample"] = {"in": news.iloc[0]["headline"], "out": float(news.iloc[0]["sentiment"])}

    with stage("classify", "Label the event type (rules, GDELT codes, then classifier)", len(tweets) + len(news)) as s:
        tc = events.classify_batch(e_model, tweets["text"].tolist())
        tweets["event_class"] = [c for c, _, _ in tc]
        nc = events.classify_batch(e_model, news["headline"].tolist(), news["root_code"].fillna("").tolist())
        news["event_class"] = [c for c, _, _ in nc]
        news["class_method"] = [m for _, m, _ in nc]
        news["class_conf"] = [p for _, _, p in nc]
        s["rows_out"] = len(tweets) + len(news)
        s["methods"] = pd.Series([m for _, m, _ in tc + nc]).value_counts().to_dict()
        s["sample"] = {"in": news.iloc[0]["headline"], "out": news.iloc[0]["event_class"]}

    with stage("impact", "Score news impact 1-10 from tone, class, volume, severity and market relevance", len(news)) as s:
        scored = [news_impact(se, ec, m, abs(g) / 10 if pd.notna(g) else 0.0, is_market_relevant(h), bool(tk))
                  for se, ec, m, g, h, tk in zip(news["sentiment"], news["event_class"], news["mentions"],
                                                 news["goldstein"], news["clean"], news["tickers"])]
        news["impact"] = [sc for sc, _ in scored]
        news["impact_parts"] = [p for _, p in scored]
        s["rows_out"] = len(news)
        s["sample"] = {"in": news.iloc[0]["headline"], "out": {"impact": int(news.iloc[0]["impact"]), "parts": news.iloc[0]["impact_parts"]}}

    with stage("aggregate", "Roll tweets up to one record per company per day; impact from abnormal attention", len(tweets)) as s:
        daily = company_daily(tweets)
        s["rows_out"] = len(daily)
        s["sample"] = {"out": daily.iloc[len(daily) // 2].drop(["top", "impact_parts"]).to_dict()}

    with stage("validate", "Check impact against the next-day price move", len(daily)) as s:
        prices = sources.load_prices()
        report["impact_vs_returns"] = validate_impact(daily, prices)
        s["rows_out"] = len(daily)
        s["sample"] = report["impact_vs_returns"]

    with stage("publish", "Write JSON signal files for the API", len(daily) + len(news)) as s:
        write_outputs(daily, news, tweets, prices, s_model, report)
        s["rows_out"] = len(daily) + len(news)

    meta = {"generated_at": pd.Timestamp.now(tz="UTC").isoformat(), "replay": [REPLAY_START, REPLAY_END], "stages": STAGES}
    (OUT / "pipeline.json").write_text(json.dumps(meta, indent=2, default=str))
    print("Done. Files are in", OUT)


def company_daily(tweets: pd.DataFrame) -> pd.DataFrame:
    """Aggregate tweets to one signal per (date, ticker)."""
    t = tweets.explode("tickers").rename(columns={"tickers": "sym"})
    t["date"] = t["ts"].dt.strftime("%Y-%m-%d")
    rows = []
    for (date, sym), g in t.groupby(["date", "sym"]):
        weights = g.assign(w=g["sentiment"].abs() + 0.05).groupby("event_class")["w"].sum()
        material = weights.drop("Other", errors="ignore")
        # A material class wins only when it carries at least a quarter of the day's weight.
        ev = material.idxmax() if len(material) and material.max() >= 0.25 * weights.sum() else "Other"
        top = g.reindex(g["sentiment"].abs().sort_values(ascending=False).index).head(2)
        rows.append({"date": date, "ticker": sym, "sentiment": round(float(g["sentiment"].mean()), 3), "event_class": ev,
                     "posts": len(g), "top": top[["text", "sentiment"]].to_dict("records")})
    daily = pd.DataFrame(rows).sort_values(["ticker", "date"]).reset_index(drop=True)

    # Abnormal attention: posts today / median posts over the previous 30 days (past only, no look-ahead).
    baseline = daily.groupby("ticker")["posts"].transform(lambda p: p.shift(1).rolling(30, min_periods=5).median())
    daily["attention"] = (daily["posts"] / baseline).fillna(1.0).round(2)
    scored = [company_impact(s, e, a) for s, e, a in zip(daily["sentiment"], daily["event_class"], daily["attention"])]
    daily["impact"] = [sc for sc, _ in scored]
    daily["impact_parts"] = [p for _, p in scored]
    return daily


def validate_impact(daily: pd.DataFrame, prices: pd.DataFrame) -> dict:
    """Do high-impact days come before bigger price moves than low-impact days?"""
    px = prices.sort_values(["ticker", "date"]).copy()
    px["next_abs_ret"] = px.groupby("ticker")["close"].pct_change().shift(-1).abs()
    m = daily.merge(px, on=["date", "ticker"], how="inner").dropna(subset=["next_abs_ret"])
    hi, lo = m[m["impact"] >= 7], m[m["impact"] <= 3]
    corr = float(np.corrcoef(m["impact"], m["next_abs_ret"])[0, 1]) if len(m) > 2 else 0.0
    return {
        "company_days": len(m),
        "corr_impact_vs_next_abs_return": round(corr, 3),
        "avg_next_abs_return_high_impact_pct": round(float(hi["next_abs_ret"].mean() * 100), 2) if len(hi) else None,
        "avg_next_abs_return_low_impact_pct": round(float(lo["next_abs_ret"].mean() * 100), 2) if len(lo) else None,
        "high_impact_days": len(hi),
        "low_impact_days": len(lo),
    }


def write_outputs(daily, news, tweets, prices, s_model, report) -> None:
    in_window = (daily["date"] >= REPLAY_START) & (daily["date"] <= REPLAY_END)
    daily_out = daily.copy()
    daily_out["top"] = [
        [{**p, "text": p["text"][:280], "explain": sentiment.explain(s_model, p["text"])} for p in top] if keep else None
        for top, keep in zip(daily_out["top"], in_window)  # example posts only for the replay window
    ]
    (OUT / "company_daily.json").write_text(daily_out.to_json(orient="records"))

    news_out = news.assign(explain=[sentiment.explain(s_model, h) for h in news["headline"]])
    cols = ["event_id", "date", "headline", "url", "place", "country", "lat", "lng", "mentions", "goldstein", "tone",
            "tickers", "sentiment", "event_class", "class_method", "class_conf", "impact", "impact_parts", "explain"]
    (OUT / "events.json").write_text(news_out[cols].to_json(orient="records"))

    end = pd.Timestamp(REPLAY_END, tz="UTC") + pd.Timedelta(days=1)
    w = tweets[(tweets["ts"] >= pd.Timestamp(REPLAY_START, tz="UTC")) & (tweets["ts"] < end)].copy()
    w["explain"] = [sentiment.explain(s_model, t) for t in w["text"]]
    w["ts"] = w["ts"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    w["text"] = w["text"].str.slice(0, 280)
    (OUT / "posts.json").write_text(w[["ts", "ticker", "tickers", "text", "sentiment", "event_class", "explain"]].to_json(orient="records"))

    series = {t: g[["date", "close"]].round(4).values.tolist() for t, g in prices[prices["ticker"].isin(UNIVERSE)].groupby("ticker")}
    (OUT / "prices.json").write_text(json.dumps(series))
    universe = {t: {"name": n, "sector": sec} for t, (n, sec, _) in UNIVERSE.items()}
    (OUT / "universe.json").write_text(json.dumps(universe, indent=2))
    (OUT / "model_report.json").write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    run(retrain="--retrain" in sys.argv)
