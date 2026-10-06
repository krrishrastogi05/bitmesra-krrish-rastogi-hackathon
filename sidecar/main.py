"""
Meridian Python sidecar. FastAPI on the loopback address (127.0.0.1:8090).

Endpoints
    GET  /health      liveness
    POST /score       score one text with the engine models (sentiment, event class, impact, explanation)
    POST /workbench   run analyst Python in the sandbox with the signals loaded as pandas DataFrames

Only the Node API calls this service. The browser never calls it directly.
"""
import io
import json
import sys
import time
from functools import lru_cache
from pathlib import Path

# UTF-8 output on Windows consoles
if sys.stdout and hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "buffer"):
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from code_sandbox import execute_code
from engine import events, sentiment
from engine.config import MODELS, OUT, UNIVERSE
from engine.impact import is_market_relevant, news_impact
from engine.pipeline import news_tickers
from engine.preprocess import cashtags, clean

app = FastAPI(title="Meridian sidecar", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "sidecar", "models": (MODELS / "sentiment.joblib").exists()}


@lru_cache(maxsize=1)
def models():
    try:
        return joblib.load(MODELS / "sentiment.joblib"), joblib.load(MODELS / "events.joblib")
    except FileNotFoundError:
        raise HTTPException(503, "Models are missing. Run: python -m engine.pipeline")


class ScoreRequest(BaseModel):
    text: str = Field(min_length=3, max_length=500)


@app.post("/score")
def score(req: ScoreRequest):
    s_model, e_model = models()
    sent = float(sentiment.score(s_model, [req.text])[0])
    ev, method, conf = events.classify(e_model, req.text)
    text = clean(req.text)
    tickers = sorted(set(news_tickers(text)) | (cashtags(req.text) & set(UNIVERSE)))
    # A single text has no mention count or conflict code, so volume and severity are zero.
    imp, parts = news_impact(sent, ev, 0, 0.0, is_market_relevant(text), bool(tickers))
    return {"sentiment": round(sent, 3), "event_class": ev, "class_method": method, "class_conf": conf, "tickers": tickers,
            "impact": imp, "impact_parts": parts, "explain": sentiment.explain(s_model, req.text)}


def _load(name: str) -> pd.DataFrame:
    path = OUT / name
    if not path.exists():
        raise HTTPException(503, f"{name} is missing. Run: python -m engine.pipeline")
    return pd.read_json(path)


_frames: dict = {"mtime": None}


def workbench_namespace() -> dict:
    """DataFrames that analyst code can use. Reloaded when the pipeline writes new files."""
    mtime = max((p.stat().st_mtime for p in OUT.glob("*.json")), default=None)
    if _frames["mtime"] != mtime:
        prices = json.loads((OUT / "prices.json").read_text())
        _frames.update({
            "mtime": mtime,
            "signals": _load("company_daily.json").drop(columns=["top"], errors="ignore"),
            "events": _load("events.json"),
            "posts": _load("posts.json"),
            "prices": pd.DataFrame([(t, d, c) for t, rows in prices.items() for d, c in rows], columns=["ticker", "date", "close"]),
            "universe": json.loads((OUT / "universe.json").read_text()),
        })
    return {k: (v.copy() if isinstance(v, pd.DataFrame) else v) for k, v in _frames.items() if k != "mtime"}


class WorkbenchRequest(BaseModel):
    code: str = Field(min_length=1, max_length=8000)


@app.post("/workbench")
def workbench(req: WorkbenchRequest):
    t0 = time.perf_counter()
    result = execute_code(req.code, extra=workbench_namespace())
    return {
        "stdout": result.stdout[-20000:],
        "stderr": result.stderr[-5000:],
        "figures": result.figures[:4],
        "table": result.table,
        "error": result.error,
        "success": result.success,
        "ms": round((time.perf_counter() - t0) * 1000, 1),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8090, workers=1, log_level="info")
