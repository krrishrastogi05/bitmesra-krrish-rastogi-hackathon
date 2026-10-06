"""Downloads and loads the raw data. Every file is cached in data/raw and downloaded once."""
import io
import zipfile
from pathlib import Path

import pandas as pd
import requests

from .config import GDELT_DAY_URL, RAW, SOURCES
from .preprocess import headline_from_url

UA = {"User-Agent": "Mozilla/5.0 (Meridian risk engine; research use)"}


def fetch(url: str, dest: Path) -> Path:
    """Download url to dest once. Later calls use the cached file."""
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, headers=UA, timeout=120)
    r.raise_for_status()
    dest.write_bytes(r.content)
    return dest


def load_labelled(name: str) -> pd.DataFrame:
    """Load one labelled HF split (sent_train, sent_valid, topic_train, topic_valid)."""
    return pd.read_csv(fetch(SOURCES[name], RAW / f"{name}.csv"))


def load_tweets() -> pd.DataFrame:
    df = pd.read_json(fetch(SOURCES["tweets"], RAW / "stock_tweets.jsonl"), lines=True)
    df = df.rename(columns={"Date": "ts", "Tweet": "text", "Stock Name": "ticker"})
    df["ts"] = pd.to_datetime(df["ts"], utc=True)
    return df[["ts", "text", "ticker"]]


def load_prices() -> pd.DataFrame:
    df = pd.read_json(fetch(SOURCES["prices"], RAW / "stock_prices.jsonl"), lines=True)
    df = df.rename(columns={"Date": "date", "Close": "close", "Stock Name": "ticker"})
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    return df[["date", "ticker", "close"]]


# GDELT 1.0 daily event file: column index -> name (only the columns we use).
GDELT_COLS = {0: "event_id", 1: "date", 26: "event_code", 28: "root_code", 29: "quad_class",
              30: "goldstein", 31: "mentions", 32: "sources", 34: "tone", 50: "place",
              51: "country", 53: "lat", 54: "lng", 57: "url"}


def load_gdelt_day(day: str, keep: int = 160) -> pd.DataFrame:
    """Load one GDELT day. Keep the most-mentioned events that have a readable headline."""
    path = fetch(GDELT_DAY_URL.format(day=day.replace("-", "")), RAW / "gdelt" / f"{day}.zip")
    with zipfile.ZipFile(path) as z:
        raw = pd.read_csv(io.BytesIO(z.read(z.namelist()[0])), sep="\t", header=None,
                          usecols=list(GDELT_COLS), dtype=str)
    df = raw.rename(columns=GDELT_COLS)
    for c in ("goldstein", "mentions", "sources", "tone", "lat", "lng"):
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.dropna(subset=["lat", "lng", "url"])
    df["headline"] = df["url"].map(headline_from_url)
    df = df[df["headline"].str.split().str.len() >= 5]
    # One row per article: the same URL produces many coded events.
    df = df.sort_values("mentions", ascending=False).drop_duplicates("url")
    df["date"] = day
    return df.head(keep).reset_index(drop=True)
