"""Impact score (1-10): a transparent sum of parts, so every score can be explained.

Two formulas, one per record type:
- news events (GDELT): tone, event class, coverage volume, conflict severity, market relevance
- company-days (tweets): abnormal attention, tone, event class

The company-day weights were checked against the next-day absolute price move (see model_report.json).
"""
import math
import re

NEWS_CLASS_WEIGHT = {"Geopolitical": 3.0, "Credit Event": 3.0, "Macro": 2.5, "M&A": 2.0, "Product Launch": 1.0, "Other": 0.5}
COMPANY_CLASS_WEIGHT = {"Geopolitical": 1.5, "Credit Event": 1.5, "Macro": 1.2, "M&A": 1.0, "Product Launch": 0.8, "Other": 0.3}

MARKET_RE = re.compile(
    r"\b(oil|gas|energy|stocks?|markets?|shares|sanction\w*|banks?|banking|econom\w*|rates?|inflation|prices?|"
    r"rubles?|roubles?|currenc\w*|bonds?|debt|trade|exports?|imports?|wheat|commodit\w*|investors?|swift|"
    r"central bank|fed|ecb|gdp|recession|supply chain|default\w*)\b")


def is_market_relevant(text: str) -> bool:
    return bool(MARKET_RE.search(text))


def _score(parts: dict) -> int:
    return int(min(10, max(1, round(sum(parts.values())))))


def news_impact(sentiment: float, event_class: str, mentions: float, severity: float,
                relevant: bool, in_universe: bool) -> tuple[int, dict]:
    """severity: 0..1, |Goldstein scale| / 10 (how conflictual the event is)."""
    parts = {
        "tone": round(2.5 * abs(sentiment), 2),
        "event_class": NEWS_CLASS_WEIGHT.get(event_class, 0.5),
        "volume": round(min(2.0, math.log1p(max(mentions, 0)) / 2.5), 2),
        "severity": round(min(max(severity, 0.0), 1.0), 2),
        "relevance": 1.5 if relevant else 0.0,
        "coverage": 0.5 if in_universe else 0.0,
    }
    return _score(parts), parts


def company_impact(sentiment: float, event_class: str, attention_ratio: float) -> tuple[int, dict]:
    """attention_ratio: posts today / the ticker's median daily posts over the previous 30 days."""
    parts = {
        "base": 1.0,
        "attention": round(min(5.0, 2.0 * math.log2(1 + max(attention_ratio, 0))), 2),
        "tone": round(2.0 * abs(sentiment), 2),
        "event_class": COMPANY_CLASS_WEIGHT.get(event_class, 0.3),
    }
    return _score(parts), parts
