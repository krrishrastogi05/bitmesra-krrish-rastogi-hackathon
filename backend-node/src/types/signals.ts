/** Shapes of the files that the Python engine writes to data/signals/. */

export type EventClass = 'Geopolitical' | 'Macro' | 'Credit Event' | 'M&A' | 'Product Launch' | 'Other';

export interface ExplainTerm { term: string; weight: number }
/** Named parts of the impact score. News: tone, event_class, volume, severity, relevance, coverage.
 *  Company-days: base, attention, tone, event_class. */
export type ImpactParts = Record<string, number>;

/** One signal per company per day (aggregated from tweets). */
export interface CompanySignal {
  date: string;
  ticker: string;
  sentiment: number;      // -1..1
  event_class: EventClass;
  impact: number;         // 1..10
  posts: number;
  attention: number;      // posts today / median posts of the previous 30 days
  impact_parts: ImpactParts;
  top: Array<{ text: string; sentiment: number; explain: ExplainTerm[] }> | null;
}

/** One signal per news event (GDELT), with location. */
export interface EventSignal {
  event_id: string;
  date: string;
  headline: string;
  url: string;
  place: string;
  country: string;
  lat: number;
  lng: number;
  mentions: number;
  goldstein: number;
  tone: number;
  tickers: string[];
  sentiment: number;
  event_class: EventClass;
  class_method: 'rule' | 'gdelt' | 'model';
  class_conf: number;
  impact: number;
  impact_parts: ImpactParts;
  explain: ExplainTerm[];
}

export interface Post {
  ts: string;
  ticker: string;
  tickers: string[];
  text: string;
  sentiment: number;
  event_class: EventClass;
  explain: ExplainTerm[];
}

export type Universe = Record<string, { name: string; sector: string }>;
/** ticker -> [date, close][] */
export type Prices = Record<string, Array<[string, number]>>;
