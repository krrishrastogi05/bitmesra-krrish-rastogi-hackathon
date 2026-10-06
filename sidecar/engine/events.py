"""Event classification: rules first (auditable), then a TF-IDF classifier trained on topic-labelled tweets."""
import re

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.pipeline import Pipeline

from .config import EVENT_CLASSES
from .preprocess import clean

# zeroshot/twitter-financial-news-topic label id -> Meridian event class
TOPIC_TO_CLASS = {
    16: "Geopolitical",                                       # Politics
    1: "Macro", 6: "Macro", 8: "Macro", 10: "Macro", 14: "Macro", 15: "Macro",  # Fed, energy, FX, metals, macro, markets
    3: "Credit Event",                                        # Treasuries | corporate debt
    11: "M&A", 13: "M&A",                                     # IPO, M&A | investments
    2: "Product Launch",                                      # Company | product news
}

RULES = [
    ("Credit Event", re.compile(r"\b(default(s|ed)?|downgrad\w*|bankrupt\w*|chapter 11|insolven\w*|junk|credit rating|missed (a )?payment|debt restructur\w*|liquidity crisis)\b")),
    ("Geopolitical", re.compile(r"\b(invasion|invade\w*|sanction\w*|troops|missile\w*|war|military|nato|kremlin|putin|ukrain\w*|russia\w*|airstrike\w*|ceasefire|embargo|coup|terror\w*|annex\w*)\b")),
    ("M&A", re.compile(r"\b(acquir\w*|acquisition|merger|takeover|buyout|to buy|deal to buy|stake in)\b")),
    ("Product Launch", re.compile(r"\b(launch\w*|unveil\w*|introduc\w*|new (model|product|chip|iphone|service)|rolls? out)\b")),
]

# GDELT CAMEO root codes for threats, protests, force posture, sanctions, coercion and violence.
GDELT_CONFLICT_ROOTS = {"13", "14", "15", "16", "17", "18", "19", "20"}


def build() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, max_features=80000)),
        ("clf", LogisticRegression(C=8.0, max_iter=3000, class_weight="balanced")),
    ])


def to_class(labels: pd.Series) -> pd.Series:
    return labels.map(lambda l: TOPIC_TO_CLASS.get(int(l), "Other"))


def train(train_df: pd.DataFrame, valid_df: pd.DataFrame) -> tuple[Pipeline, dict]:
    model = build().fit(train_df["text"].map(clean), to_class(train_df["label"]))
    truth = to_class(valid_df["label"])
    pred = [c for c, _, _ in classify_batch(model, valid_df["text"].tolist())]
    report = {
        "dataset": "zeroshot/twitter-financial-news-topic (20 topics mapped to 6 classes)",
        "train_rows": len(train_df), "valid_rows": len(valid_df),
        "accuracy": round(accuracy_score(truth, pred), 4),
        "macro_f1": round(f1_score(truth, pred, average="macro"), 4),
        "labels": EVENT_CLASSES,
        "confusion": confusion_matrix(truth, pred, labels=EVENT_CLASSES).tolist(),
    }
    return model, report


def classify_batch(model: Pipeline, texts: list[str], gdelt_roots: list[str] | None = None) -> list[tuple[str, str, float]]:
    """Return (event_class, method, confidence) per text. method is 'rule', 'gdelt' or 'model'."""
    cleaned = [clean(t) for t in texts]
    out: list = [None] * len(cleaned)
    todo = []
    for i, t in enumerate(cleaned):
        rule = next((label for label, pattern in RULES if pattern.search(t)), None)
        if rule:
            out[i] = (rule, "rule", 0.95)
        elif gdelt_roots and gdelt_roots[i] in GDELT_CONFLICT_ROOTS:
            out[i] = ("Geopolitical", "gdelt", 0.9)
        else:
            todo.append(i)
    if todo:
        proba = model.predict_proba([cleaned[i] for i in todo])
        classes = model.named_steps["clf"].classes_
        for k, i in enumerate(todo):
            j = int(proba[k].argmax())
            out[i] = (str(classes[j]), "model", round(float(proba[k, j]), 3))
    return out


def classify(model: Pipeline, text: str, gdelt_root: str | None = None) -> tuple[str, str, float]:
    return classify_batch(model, [text], [gdelt_root] if gdelt_root else None)[0]
