"""Sentiment model: TF-IDF + logistic regression trained on labelled financial tweets.

score = P(bullish) - P(bearish), so the range is -1.0 to 1.0.
Each score can be explained: every word contributes tfidf(word) * (coef_bullish - coef_bearish).
"""
import re

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.pipeline import Pipeline

from .preprocess import clean

LABELS = {0: "bearish", 1: "bullish", 2: "neutral"}  # zeroshot/twitter-financial-news-sentiment
BEAR, BULL = 0, 1


def build() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, max_features=60000)),
        ("clf", LogisticRegression(C=6.0, max_iter=3000, class_weight="balanced")),
    ])


def train(train_df: pd.DataFrame, valid_df: pd.DataFrame) -> tuple[Pipeline, dict]:
    model = build().fit(train_df["text"].map(clean), train_df["label"])
    pred = model.predict(valid_df["text"].map(clean))
    report = {
        "dataset": "zeroshot/twitter-financial-news-sentiment",
        "train_rows": len(train_df), "valid_rows": len(valid_df),
        "accuracy": round(accuracy_score(valid_df["label"], pred), 4),
        "macro_f1": round(f1_score(valid_df["label"], pred, average="macro"), 4),
        "labels": [LABELS[i] for i in range(3)],
        "confusion": confusion_matrix(valid_df["label"], pred, labels=[0, 1, 2]).tolist(),
    }
    return model, report


def score(model: Pipeline, texts: list[str]) -> np.ndarray:
    proba = model.predict_proba([clean(t) for t in texts])
    classes = list(model.named_steps["clf"].classes_)
    return proba[:, classes.index(BULL)] - proba[:, classes.index(BEAR)]


# Finance-risk word list for news text. The tweet-trained model has not seen enough news language
# (for example it learned "visa" and "russia" as bullish). Each stem has a fixed, auditable weight.
LEXICON = {
    **{w: -1.0 for w in ["sanction", "invade", "invasion", "war", "attack", "missile", "bomb", "kill", "crash", "plunge",
                         "tumble", "slump", "selloff", "sell-off", "default", "downgrad", "bankrupt", "insolven", "crisis",
                         "collapse", "recession", "shortage", "disrupt", "suspend", "halt", "ban", "freeze", "seize",
                         "fraud", "lawsuit", "probe", "layoff", "explosion", "conflict", "escalat", "threat", "fear",
                         "cut off", "shut", "withdraw", "exit", "loss", "losses", "slash"]},
    **{w: -0.5 for w in ["warn", "risk", "tension", "volatil", "fall", "drop", "decline", "cut", "inflation", "slow", "weak"]},
    **{w: 0.5 for w in ["rise", "gain", "growth", "boost", "expand", "approve", "support", "invest", "ease", "strong"]},
    **{w: 1.0 for w in ["rally", "rebound", "recover", "record high", "beat", "upgrade", "profit", "ceasefire", "peace",
                        "agreement", "relief", "optimism", "surpass"]},
}
_LEX_RE = re.compile(r"\b(" + "|".join(sorted(map(re.escape, LEXICON), key=len, reverse=True)) + r")[a-z]*")


def lexicon_hits(text: str) -> list[dict]:
    return [{"term": m.group(0), "weight": LEXICON[m.group(1)], "source": "lexicon"} for m in _LEX_RE.finditer(clean(text))]


def lexicon_score(text: str) -> float | None:
    """Mean weight of the risk words in the text, or None when no word matches."""
    hits = lexicon_hits(text)
    return float(np.clip(sum(h["weight"] for h in hits) / len(hits), -1, 1)) if hits else None


def score_news(model: Pipeline, texts: list[str]) -> np.ndarray:
    """News tone: the model blended with the risk word list (60/40) when the list has a match."""
    base = score(model, texts)
    lex = [lexicon_score(t) for t in texts]
    return np.array([b if l is None else 0.6 * b + 0.4 * l for b, l in zip(base, lex)])


def explain_news(model: Pipeline, text: str, top: int = 6) -> list[dict]:
    """Model terms plus the risk words that matched."""
    terms = [{**t, "source": "model"} for t in explain(model, text, top)]
    seen = {t["term"] for t in terms}
    return terms + [h for h in lexicon_hits(text) if h["term"] not in seen]


_EXPLAIN_CACHE: dict[int, tuple] = {}


def _vocab_and_direction(model: Pipeline) -> tuple:
    """Feature names and the bullish-minus-bearish weights. Computed once per model."""
    key = id(model)
    if key not in _EXPLAIN_CACHE:
        vec, clf = model.named_steps["tfidf"], model.named_steps["clf"]
        classes = list(clf.classes_)
        _EXPLAIN_CACHE[key] = (vec.get_feature_names_out(), clf.coef_[classes.index(BULL)] - clf.coef_[classes.index(BEAR)])
    return _EXPLAIN_CACHE[key]


def explain(model: Pipeline, text: str, top: int = 6) -> list[dict]:
    """Return the words that pushed the score most, with their signed contribution."""
    vocab, direction = _vocab_and_direction(model)
    row = model.named_steps["tfidf"].transform([clean(text)])
    contrib = [(vocab[j], float(row[0, j] * direction[j])) for j in row.nonzero()[1]]
    contrib.sort(key=lambda kv: abs(kv[1]), reverse=True)
    return [{"term": t, "weight": round(w, 3)} for t, w in contrib[:top]]
