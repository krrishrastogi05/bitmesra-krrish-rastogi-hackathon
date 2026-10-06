"""Text clean-up shared by training and scoring."""
import html
import re
from urllib.parse import unquote, urlparse

URL_RE = re.compile(r"https?://\S+")
MENTION_RE = re.compile(r"@\w+")
CASHTAG_RE = re.compile(r"\$([A-Za-z]{1,5})\b")
SPACE_RE = re.compile(r"\s+")


def fix_mojibake(text: str) -> str:
    """Repair UTF-8 text that was decoded as Latin-1 (for example 'â€™' instead of an apostrophe)."""
    if "â" not in text and "Ã" not in text:
        return text
    try:
        return text.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return text


def clean(text: str) -> str:
    """Normalise a tweet or headline for the models. Cashtags stay as tokens such as '$tsla'."""
    text = fix_mojibake(html.unescape(str(text)))
    text = URL_RE.sub(" ", text)
    text = MENTION_RE.sub(" @user ", text)
    return SPACE_RE.sub(" ", text).strip().lower()


def cashtags(text: str) -> set[str]:
    return {m.upper() for m in CASHTAG_RE.findall(str(text))}


SLUG_JUNK = re.compile(r"^(index|article|story|news|amp|html?|php|\d+)$")


def headline_from_url(url: str) -> str:
    """Turn a news URL slug into a readable headline.
    Example: .../2022/02/24/russia-invades-ukraine-oil-jumps.html -> 'russia invades ukraine oil jumps'."""
    try:
        path = unquote(urlparse(str(url)).path)
    except ValueError:
        return ""
    parts = [re.split(r"[&?=;]", p)[0] for p in path.split("/") if p]  # drop tracking parameters inside the path
    best = max(parts, key=lambda p: p.count("-"), default="")
    best = re.sub(r"\.(html?|php|aspx?)$", "", best)
    best = re.sub(r"[^a-zA-Z0-9\-_']+", "-", best)  # dashes, quotes and other symbols become separators
    words = [w for w in re.split(r"[-_]+", best) if w and not SLUG_JUNK.match(w) and not re.search(r"\d{4,}", w)]
    return " ".join(words).lower()
