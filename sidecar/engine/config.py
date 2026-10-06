"""Paths, data sources and the stock universe for the engine."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
RAW = DATA / "raw"
OUT = DATA / "signals"
MODELS = ROOT / "sidecar" / "models"

HF = "https://huggingface.co/datasets"
SOURCES = {
    # Labelled financial tweets (bearish / bullish / neutral) used to train sentiment.
    "sent_train": f"{HF}/zeroshot/twitter-financial-news-sentiment/resolve/main/sent_train.csv",
    "sent_valid": f"{HF}/zeroshot/twitter-financial-news-sentiment/resolve/main/sent_valid.csv",
    # Labelled financial tweets with 20 topics, used to train the event classifier.
    "topic_train": f"{HF}/zeroshot/twitter-financial-news-topic/resolve/main/topic_train.csv",
    "topic_valid": f"{HF}/zeroshot/twitter-financial-news-topic/resolve/main/topic_valid.csv",
    # Kaggle "Stock Tweets for Sentiment Analysis and Prediction" (Sep 2021 - Sep 2022), HF mirror.
    "tweets": f"{HF}/khaihernlow/stock-tweets-for-sentiment-analysis-and-prediction/resolve/main/data/stock_tweets.jsonl",
    "prices": f"{HF}/khaihernlow/stock-tweets-for-sentiment-analysis-and-prediction/resolve/main/data/stock_yfinance_data.jsonl",
}
GDELT_DAY_URL = "http://data.gdeltproject.org/events/{day}.export.CSV.zip"

# Replay window: Russia-Ukraine escalation.
REPLAY_START = "2022-02-17"
REPLAY_END = "2022-03-09"

# S&P 100 members that the tweet dataset covers. ticker -> (name, sector, name aliases for headline matching)
UNIVERSE = {
    "AAPL": ("Apple", "Technology", ["apple", "iphone"]),
    "MSFT": ("Microsoft", "Technology", ["microsoft"]),
    "AMZN": ("Amazon", "Consumer Discretionary", ["amazon"]),
    "GOOG": ("Alphabet", "Communication Services", ["google", "alphabet"]),
    "META": ("Meta Platforms", "Communication Services", ["facebook", "meta-platforms", "instagram"]),
    "TSLA": ("Tesla", "Consumer Discretionary", ["tesla"]),
    "AMD": ("AMD", "Technology", ["amd"]),
    "NFLX": ("Netflix", "Communication Services", ["netflix"]),
    "PYPL": ("PayPal", "Financials", ["paypal"]),
    "DIS": ("Walt Disney", "Communication Services", ["disney"]),
    "BA": ("Boeing", "Industrials", ["boeing"]),
    "COST": ("Costco", "Consumer Staples", ["costco"]),
    "INTC": ("Intel", "Technology", ["intel"]),
    "KO": ("Coca-Cola", "Consumer Staples", ["coca-cola", "coke"]),
    "PG": ("Procter & Gamble", "Consumer Staples", ["procter"]),
    "CRM": ("Salesforce", "Technology", ["salesforce"]),
}

EVENT_CLASSES = ["Geopolitical", "Macro", "Credit Event", "M&A", "Product Launch", "Other"]
