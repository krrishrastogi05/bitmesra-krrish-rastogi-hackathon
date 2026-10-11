# Data

All data that the prototype uses. Every source is public, or synthetic and made for this project. No proprietary or confidential data is used.

| Path | Content | Source |
|---|---|---|
| `signals/` | Engine output that the terminal runs on: `events.json` (scored GDELT news events), `company_daily.json` (company-day signals), `posts.json` (scored tweets in the replay window), `prices.json`, `universe.json`, `model_report.json`, `pipeline.json` | Written by `python -m engine.pipeline` |
| `raw/sent_train.csv`, `raw/sent_valid.csv` | Labelled financial tweets (bearish, bullish, neutral) for the sentiment model | [zeroshot/twitter-financial-news-sentiment](https://huggingface.co/datasets/zeroshot/twitter-financial-news-sentiment) |
| `raw/topic_train.csv`, `raw/topic_valid.csv` | Labelled financial tweets (20 topics) for the event classifier | [zeroshot/twitter-financial-news-topic](https://huggingface.co/datasets/zeroshot/twitter-financial-news-topic) |
| `raw/stock_prices.jsonl` | Daily prices (yfinance) for the 16 stocks | [Stock Tweets for Sentiment Analysis and Prediction](https://huggingface.co/datasets/khaihernlow/stock-tweets-for-sentiment-analysis-and-prediction) (Kaggle, HF mirror) |
| `synthetic/bank_book.json` | **Synthetic** bank book for Module B: 24 positions (loans, bonds, equities, derivatives) and capital (CET1, RWA). Invented for the demo; it does not describe a real bank. | Exported from `backend-node/src/services/portfolio.ts` |
| `synthetic/stress_scenarios.json` | **Synthetic** stress scenarios: event-class triggers and shock sizes | Exported from `backend-node/src/services/stressTester.ts` |

Not committed because of size (the engine downloads them to `raw/` on its first run):

| File | Size | Source |
|---|---|---|
| `raw/stock_tweets.jsonl` | about 24 MB | [Stock Tweets for Sentiment Analysis and Prediction](https://huggingface.co/datasets/khaihernlow/stock-tweets-for-sentiment-analysis-and-prediction) |
| `raw/gdelt/*.export.CSV.zip` | about 160 MB | [GDELT 1.0 daily event files](http://data.gdeltproject.org/events/index.html), 17 Feb to 9 Mar 2022 |
