import React, { useState } from 'react';
import { ArrowRight, Globe, Landmark, ScanSearch } from 'lucide-react';

const HIGHLIGHT_CARDS = [
  {
    icon: ScanSearch,
    accent: 'var(--amber)',
    label: 'Explainable NLP',
    headline: 'No LLM. Every score has a reason.',
    body: 'TF-IDF models, rules and a finance-risk word list. Each signal shows the words and the parts behind its score.',
    glow: true,
  },
  {
    icon: Globe,
    accent: 'var(--red)',
    label: 'Risk Globe',
    headline: 'See the news move',
    body: 'GDELT events on a 3D globe. Replay the Russia–Ukraine shock day by day, with alerts on high-impact events.',
  },
  {
    icon: Landmark,
    accent: 'var(--cyan)',
    label: 'Act on it',
    headline: 'Rebalance and stress-test',
    body: 'A sentiment-tilted S&P 100 index and a bank book stress test with the CET1 impact, both driven by the signals.',
  },
];

const SECONDARY = ['Bloomberg-style commands', 'Python workbench', 'Pipeline monitor', 'GDELT + Kaggle tweets', 'JSON / CSV API'];

export default function SplashScreen({ onComplete }) {
  const [fadeOut, setFadeOut] = useState(false);

  const handleOpen = () => {
    setFadeOut(true);
    setTimeout(() => onComplete(), 500);
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

    .lp-root {
      --lp-bg: #000000; --lp-fg: 255,255,255; --lp-ink: #ffffff; --lp-badge: #ffcf70;
      --lp-cta-bg: #ffffff; --lp-cta-fg: #000000;
      position: fixed; inset: 0; z-index: 100;
      background: var(--lp-bg);
      font-family: 'Inter', sans-serif;
      overflow-y: auto;
      transition: opacity 0.5s ease;
    }
    :root[data-theme="light"] .lp-root {
      --lp-bg: #f4f6f9; --lp-fg: 15,23,42; --lp-ink: #0f172a; --lp-badge: #b45309;
      --lp-cta-bg: #0f172a; --lp-cta-fg: #ffffff;
    }
    :root[data-theme="light"] .lp-team, :root[data-theme="light"] .lp-footnote { color: rgba(15,23,42,0.55); }
    :root[data-theme="light"] .lp-kicker { color: rgba(15,23,42,0.6); }
    :root[data-theme="light"] .lp-tagline { color: rgba(15,23,42,0.7); }
    :root[data-theme="light"] .lp-tagline strong { color: #0f172a; }
    :root[data-theme="light"] .lp-card { background: #ffffff; border-color: rgba(15,23,42,0.1); box-shadow: 0 1px 2px rgba(15,23,42,0.05); }
    :root[data-theme="light"] .lp-card-body { color: rgba(15,23,42,0.7); }
    :root[data-theme="light"] .lp-pill { color: rgba(15,23,42,0.68); border-color: rgba(15,23,42,0.16); background: #ffffff; }
    .lp-root.lp-out { opacity: 0; pointer-events: none; }

    .lp-blob {
      position: fixed;
      border-radius: 50%;
      filter: blur(160px);
      pointer-events: none;
      z-index: 0;
    }
    .lp-blob-1 {
      width: 800px; height: 800px;
      background: radial-gradient(circle, rgba(255,176,32,0.12) 0%, transparent 65%);
      top: -300px; left: -200px;
    }
    .lp-blob-2 {
      width: 600px; height: 600px;
      background: radial-gradient(circle, rgba(255,77,79,0.09) 0%, transparent 65%);
      bottom: -200px; right: -100px;
    }

    /* ── Stage ── */
    .lp-stage {
      position: relative; z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0;
      min-height: 100vh;
      max-width: 860px;
      width: 100%;
      margin: 0 auto;
      padding: 48px 24px 56px;
      box-sizing: border-box;
    }

    /* Badge row */
    .lp-top {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-bottom: 36px;
    }
    .lp-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 99px;
      border: 1px solid rgba(255,176,32,0.5);
      background: rgba(255,176,32,0.1);
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: var(--lp-badge);
      letter-spacing: 0.03em;
    }
    .lp-dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #ff4d4f;
      animation: lp-blink 2s ease-in-out infinite;
    }
    @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
    .lp-team {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(var(--lp-fg),0.22);
    }

    /* Headline block */
    .lp-headline-block { margin-bottom: 14px; }
    .lp-kicker {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: rgba(var(--lp-fg),0.28);
      margin-bottom: 10px;
    }
    .lp-h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: clamp(48px, 7vw, 88px);
      font-weight: 700;
      color: var(--lp-ink);
      line-height: 1.0;
      letter-spacing: -0.04em;
      margin: 0;
    }
    .lp-h1 .g {
      background: linear-gradient(135deg, #ffb020 0%, #ff4d4f 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Tagline */
    .lp-tagline {
      font-family: 'Inter', sans-serif;
      font-size: clamp(15px, 1.8vw, 18px);
      font-weight: 400;
      color: rgba(var(--lp-fg),0.42);
      line-height: 1.65;
      max-width: 560px;
      margin: 0 auto 40px;
    }
    .lp-tagline strong {
      color: rgba(var(--lp-fg),0.78);
      font-weight: 600;
    }

    /* Highlight cards */
    .lp-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      width: 100%;
      margin-bottom: 28px;
    }
    .lp-card {
      border-radius: 16px;
      border: 1px solid rgba(var(--lp-fg),0.07);
      background: rgba(var(--lp-fg),0.03);
      padding: 20px 20px 22px;
      text-align: left;
      transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
      cursor: default;
    }
    .lp-card:hover {
      background: rgba(var(--lp-fg),0.055);
      border-color: rgba(var(--lp-fg),0.14);
    }
    .lp-card.glow {
      border-color: rgba(255,176,32,0.3);
      background: rgba(255,176,32,0.04);
      box-shadow: 0 0 40px rgba(255,176,32,0.08);
    }
    .lp-card.glow:hover {
      border-color: rgba(255,176,32,0.5);
      box-shadow: 0 0 60px rgba(255,176,32,0.13);
    }
    .lp-card-top {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .lp-card-icon {
      width: 32px; height: 32px;
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .lp-card-chip {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      padding: 3px 9px;
      border-radius: 99px;
      border: 1px solid;
    }
    .lp-card-headline {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 17px;
      font-weight: 700;
      color: var(--lp-ink);
      letter-spacing: -0.02em;
      margin-bottom: 7px;
    }
    .lp-card-body {
      font-size: 12.5px;
      color: rgba(var(--lp-fg),0.45);
      line-height: 1.6;
    }

    /* Secondary pills */
    .lp-secondary {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin-bottom: 36px;
    }
    .lp-pill {
      font-size: 12px;
      font-weight: 500;
      color: rgba(var(--lp-fg),0.4);
      padding: 5px 14px;
      border-radius: 99px;
      border: 1px solid rgba(var(--lp-fg),0.09);
      background: transparent;
      cursor: default;
      transition: color 0.2s, border-color 0.2s;
    }
    .lp-pill:hover { color: rgba(var(--lp-fg),0.75); border-color: rgba(var(--lp-fg),0.22); }

    /* CTA */
    .lp-cta-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .lp-cta {
      position: relative; overflow: hidden;
      display: inline-flex; align-items: center; gap: 10px;
      padding: 15px 44px;
      border-radius: 14px;
      background: var(--lp-cta-bg);
      color: var(--lp-cta-fg);
      font-family: 'Space Grotesk', sans-serif;
      font-size: 16px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      letter-spacing: -0.01em;
      transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s;
      box-shadow: 0 0 0 1px rgba(var(--lp-fg),0.2), 0 8px 32px rgba(var(--lp-fg),0.07);
    }
    .lp-cta:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 0 0 1px rgba(var(--lp-fg),0.35), 0 16px 48px rgba(var(--lp-fg),0.13);
    }
    .lp-cta .arr { transition: transform 0.2s; }
    .lp-cta:hover .arr { transform: translateX(4px); }
    .lp-cta::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent);
      transform: translateX(-100%);
      animation: lp-sh 3s infinite;
    }
    @keyframes lp-sh { 60%,100%{ transform: translateX(200%); } }
    .lp-footnote {
      font-size: 11px;
      color: rgba(var(--lp-fg),0.18);
      letter-spacing: 0.03em;
    }

    /* Animations */
    .a { animation: lp-up 0.6s ease-out both; }
    @keyframes lp-up {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 680px) {
      .lp-cards { grid-template-columns: 1fr; }
      .lp-h1 { font-size: 52px; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className={`lp-root${fadeOut ? ' lp-out' : ''}`}>
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />

        <div className="lp-stage">

          {/* Badge + team */}
          <div className="lp-top a" style={{ animationDelay: '0s' }}>
            <div className="lp-badge">
              <span className="lp-dot" />
              S&amp;P Global Hackathon · 2026
            </div>
            <span className="lp-team">Risk signals from news and social media</span>
          </div>

          {/* Headline */}
          <div className="lp-headline-block a" style={{ animationDelay: '0.08s' }}>
            <p className="lp-kicker">Meridian · Risk Terminal</p>
            <h1 className="lp-h1">Read the news.<br /><span className="g">Price the risk.</span></h1>
          </div>

          {/* Tagline */}
          <p className="lp-tagline a" style={{ animationDelay: '0.16s' }}>
            Turn financial news and tweets into <strong>explainable risk signals</strong>, then act on them:
            rebalance an index and stress-test a bank book. No LLMs.
          </p>

          {/* 3 highlight cards */}
          <div className="lp-cards a" style={{ animationDelay: '0.24s' }}>
            {HIGHLIGHT_CARDS.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className={`lp-card${c.glow ? ' glow' : ''}`}>
                  <div className="lp-card-top">
                    <div
                      className="lp-card-icon"
                      style={{ background: `color-mix(in srgb, ${c.accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${c.accent} 22%, transparent)` }}
                    >
                      <Icon size={15} style={{ color: c.accent }} />
                    </div>
                    <span
                      className="lp-card-chip"
                      style={{ color: c.accent, borderColor: `color-mix(in srgb, ${c.accent} 25%, transparent)`, background: `color-mix(in srgb, ${c.accent} 7%, transparent)` }}
                    >
                      {c.label}
                    </span>
                  </div>
                  <div className="lp-card-headline">{c.headline}</div>
                  <div className="lp-card-body">{c.body}</div>
                </div>
              );
            })}
          </div>

          {/* Secondary pills */}
          <div className="lp-secondary a" style={{ animationDelay: '0.32s' }}>
            {SECONDARY.map((s) => (
              <span key={s} className="lp-pill">{s}</span>
            ))}
          </div>

          {/* CTA */}
          <div className="lp-cta-wrap a" style={{ animationDelay: '0.4s' }}>
            <button className="lp-cta" onClick={handleOpen}>
              Open terminal <ArrowRight size={16} className="arr" />
            </button>
            <span className="lp-footnote">F1–F7 switch views · Ctrl+K opens the command line</span>
          </div>

        </div>
      </div>
    </>
  );
}
