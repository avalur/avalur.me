import { useState, useEffect } from "react";
import { cyprusCards } from "../data/cyprusCardsData";
import type { CyprusCard } from "../data/cyprusCardsData";
import CyprusNetworkBg from "./CyprusNetworkBg";

export type Lang = "en" | "ru" | "el";

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "ru", flag: "🇷🇺", label: "RU" },
  { code: "el", flag: "🇬🇷", label: "EL" },
];

function t(card: CyprusCard, field: "title" | "dark" | "light", lang: Lang) {
  if (lang === "ru") return card[`${field}Ru`];
  if (lang === "el") return card[`${field}El`];
  return card[field];
}

const PAGE_URL = "https://avalur.me/nice-cyprus/";

export default function CyprusCards() {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [lang, setLang] = useState<Lang>("en");
  const [nodeCount, setNodeCount] = useState(400);
  const darkRatio = flipped.size / cyprusCards.length;

  useEffect(() => {
    setNodeCount(window.innerWidth < 768 ? 200 : 700);
  }, []);

  const toggle = (id: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const flipAll = () => {
    if (flipped.size === cyprusCards.length) {
      setFlipped(new Set());
    } else {
      setFlipped(new Set(cyprusCards.map((c) => c.id)));
    }
  };

  return (
    <div className="cyprus-container">
      <style>{cssText}</style>
      <CyprusNetworkBg darkRatio={darkRatio} nodeCount={nodeCount} />

      <div className="cyprus-lang-switcher">
        {LANGS.map((l) => (
          <button
            key={l.code}
            className={`cyprus-lang-btn ${lang === l.code ? "active" : ""}`}
            onClick={() => setLang(l.code)}
          >
            <span className="cyprus-lang-flag">{l.flag}</span>
            <span className="cyprus-lang-label">{l.label}</span>
          </button>
        ))}
      </div>

      <div className="cyprus-content-layer">
      <a href="/posts" className="cyprus-back-link">&larr; Back to posts</a>
      <div className="cyprus-header">
        <h1 className="cyprus-title">
          {lang === "en" ? "Nice Cyprus" : lang === "ru" ? "Прекрасный Кипр" : "Ωραία Κύπρος"}
        </h1>
        <button className="cyprus-flip-all" onClick={flipAll}>
          {flipped.size === cyprusCards.length
            ? lang === "en" ? "Show bright side ☀️" : lang === "ru" ? "Покажи плюсы ☀️" : "Δείξε τη φωτεινή πλευρά ☀️"
            : lang === "en" ? "Show dark side 🌑" : lang === "ru" ? "Покажи минусы 🌑" : "Δείξε τη σκοτεινή πλευρά 🌑"}
        </button>
      </div>

      <div className="cyprus-grid">
        {cyprusCards.map((card) => (
          <div
            key={card.id}
            className="cyprus-card-wrapper"
            onClick={() => toggle(card.id)}
          >
            <div
              className={`cyprus-card-inner ${flipped.has(card.id) ? "is-flipped" : ""}`}
            >
              <CardFaceLight card={card} lang={lang} />
              <CardFaceDark card={card} lang={lang} />
            </div>
          </div>
        ))}
      </div>

      <p className="cyprus-footer">
        {lang === "en"
          ? "Based on real experiences. All facts are true. Humor is a coping mechanism."
          : lang === "ru"
          ? "Основано на реальном опыте. Только правда. Юмор — это защитный механизм."
          : "Βασισμένο σε πραγματικές εμπειρίες. Όλα τα γεγονότα είναι αληθινά. Το χιούμορ είναι μηχανισμός αντιμετώπισης."}
      </p>

      <div className="cyprus-share-section">
        <p className="cyprus-share-label">
          {lang === "en" ? "Share:" : lang === "ru" ? "Поделиться:" : "Κοινοποίηση:"}
        </p>
        <div className="cyprus-share-row">
          <a href={`https://x.com/intent/post?url=${encodeURIComponent(PAGE_URL)}`} target="_blank" rel="noopener noreferrer" title="Share on X" className="cyprus-share-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(PAGE_URL)}`} target="_blank" rel="noopener noreferrer" title="Share on LinkedIn" className="cyprus-share-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
          </a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(PAGE_URL)}`} target="_blank" rel="noopener noreferrer" title="Share on Telegram" className="cyprus-share-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
          </a>
          <a href={`https://www.facebook.com/sharer.php?u=${encodeURIComponent(PAGE_URL)}`} target="_blank" rel="noopener noreferrer" title="Share on Facebook" className="cyprus-share-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          </a>
          <a href={`mailto:?subject=${encodeURIComponent("Nice Cyprus")}&body=${encodeURIComponent(PAGE_URL)}`} title="Share via Email" className="cyprus-share-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
          </a>
        </div>
        <p className="cyprus-tg-link">
          {lang === "en"
            ? <>Join <a href="https://t.me/TechneNotes" target="_blank" rel="noopener noreferrer">Telegram channel</a> and share your thoughts!</>
            : lang === "ru"
            ? <>Присоединяйтесь к <a href="https://t.me/TechneNotes" target="_blank" rel="noopener noreferrer">Telegram-каналу</a> и делитесь впечатлениями!</>
            : <>Μπείτε στο <a href="https://t.me/TechneNotes" target="_blank" rel="noopener noreferrer">κανάλι Telegram</a> και μοιραστείτε τις σκέψεις σας!</>}
        </p>
      </div>
      </div>
    </div>
  );
}

function CardFaceDark({ card, lang }: { card: CyprusCard; lang: Lang }) {
  return (
    <div className="cyprus-face cyprus-face-dark">
      <img
        src={card.photo}
        alt=""
        className="cyprus-photo cyprus-photo-dark"
        loading="lazy"
      />
      <div className="cyprus-overlay-dark" />
      <div className="cyprus-content">
        <span className="cyprus-emoji">{card.darkEmoji}</span>
        <h3 className="cyprus-card-title dark-title">{t(card, "title", lang)}</h3>
        <p className="cyprus-card-text dark-text">{t(card, "dark", lang)}</p>
      </div>
      <span className="cyprus-hint">
        {lang === "en" ? "tap to flip" : lang === "ru" ? "нажми, чтобы перевернуть" : "πάτα για αναστροφή"}
      </span>
    </div>
  );
}

function CardFaceLight({ card, lang }: { card: CyprusCard; lang: Lang }) {
  return (
    <div className="cyprus-face cyprus-face-light">
      <img
        src={card.photo}
        alt=""
        className="cyprus-photo cyprus-photo-light"
        loading="lazy"
      />
      <div className="cyprus-overlay-light" />
      <div className="cyprus-content">
        <span className="cyprus-emoji">{card.emoji}</span>
        <h3 className="cyprus-card-title light-title">{t(card, "title", lang)}</h3>
        <p className="cyprus-card-text light-text">{t(card, "light", lang)}</p>
      </div>
    </div>
  );
}

const cssText = `
  .cyprus-container {
    position: relative;
    min-height: 100vh;
  }

  .cyprus-content-layer {
    position: relative;
    z-index: 1;
    padding: 2rem 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .cyprus-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .cyprus-title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    background: linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .cyprus-subtitle {
    font-size: 1.1rem;
    color: #94a3b8;
    margin-bottom: 1.5rem;
  }

  .cyprus-lang-switcher {
    position: fixed;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(12px);
    border-radius: 1.5rem;
    padding: 0.35rem;
    border: 1px solid rgba(255,255,255,0.15);
  }

  .cyprus-lang-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.5rem 0.4rem;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.5);
    cursor: pointer;
    border-radius: 1.2rem;
    transition: all 0.2s;
    font-family: Inter, system-ui, sans-serif;
  }

  .cyprus-lang-btn:hover {
    background: rgba(255,255,255,0.1);
    color: #fff;
  }

  .cyprus-lang-btn.active {
    background: rgba(255,255,255,0.2);
    color: #fff;
  }

  .cyprus-lang-flag {
    font-size: 1.3rem;
    line-height: 1;
  }

  .cyprus-lang-label {
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .cyprus-flip-all {
    padding: 0.6rem 1.8rem;
    border-radius: 9999px;
    border: 1px solid rgba(255,255,255,0.35);
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(8px);
    color: #fff;
    cursor: pointer;
    font-size: 0.9rem;
    font-family: Inter, system-ui, sans-serif;
    transition: all 0.2s;
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .cyprus-flip-all:hover {
    background: rgba(255,255,255,0.2);
    border-color: rgba(255,255,255,0.5);
  }

  @media (max-width: 768px) {
    .cyprus-lang-switcher {
      right: 0.5rem;
      padding: 0.25rem;
    }
    .cyprus-lang-btn {
      padding: 0.4rem 0.3rem;
    }
    .cyprus-lang-flag {
      font-size: 1.1rem;
    }
  }

  .cyprus-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  @media (max-width: 400px) {
    .cyprus-grid {
      grid-template-columns: 1fr;
    }
  }

  /* --- Card wrapper & flip --- */
  .cyprus-card-wrapper {
    perspective: 1000px;
    height: 380px;
    cursor: pointer;
  }

  .cyprus-card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    -webkit-transform-style: preserve-3d;
    transform-style: preserve-3d;
  }

  .cyprus-card-inner.is-flipped {
    transform: rotateY(180deg);
  }

  /* --- Face (shared) --- */
  .cyprus-face {
    position: absolute;
    inset: 0;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    border-radius: 1rem;
    overflow: hidden;
  }

  .cyprus-face-light {
    transform: rotateY(0deg);
  }

  .cyprus-face-dark {
    transform: rotateY(180deg);
  }

  /* --- Photo --- */
  .cyprus-photo {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cyprus-photo-dark {
    filter: grayscale(0.85) brightness(0.35) contrast(1.1);
  }

  .cyprus-photo-light {
    filter: saturate(1.3) brightness(1.05) contrast(1.05);
  }

  /* --- Overlays --- */
  .cyprus-overlay-dark {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.1) 0%,
      rgba(0, 0, 0, 0.55) 25%,
      rgba(0, 0, 0, 0.8) 100%
    );
  }

  .cyprus-overlay-light {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.55) 25%,
      rgba(255, 255, 255, 0.82) 100%
    );
  }

  /* --- Content --- */
  .cyprus-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding-top: 25%;
    height: 100%;
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    padding-bottom: 1.5rem;
  }

  .cyprus-emoji {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .cyprus-card-title {
    font-size: 1.3rem;
    font-weight: 700;
    margin-bottom: 0.4rem;
  }

  .dark-title { color: #f1f5f9; }
  .light-title { color: #0f172a; text-shadow: 0 0 12px rgba(255,255,255,0.9), 0 0 4px rgba(255,255,255,1); }

  .cyprus-card-text {
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .dark-text { color: #cbd5e1; }
  .light-text { color: #1e293b; text-shadow: 0 0 10px rgba(255,255,255,0.9), 0 0 3px rgba(255,255,255,1); }

  .cyprus-hint {
    position: absolute;
    bottom: 0.75rem;
    right: 1rem;
    font-size: 0.7rem;
    color: rgba(148, 163, 184, 0.5);
    font-style: italic;
    z-index: 2;
  }

  /* --- Footer --- */
  .cyprus-footer {
    text-align: center;
    color: rgba(255,255,255,0.6);
    font-size: 0.85rem;
    margin-top: 3rem;
    font-style: italic;
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }

  /* --- Hover effects --- */
  .cyprus-card-wrapper {
    transition: transform 0.3s ease;
  }

  .cyprus-card-wrapper:hover {
    transform: scale(1.03);
  }

  .cyprus-photo {
    transition: filter 0.3s ease;
  }

  .cyprus-card-wrapper:hover .cyprus-photo-dark {
    filter: grayscale(0.7) brightness(0.4) contrast(1.1);
  }

  .cyprus-card-wrapper:hover .cyprus-photo-light {
    filter: saturate(1.5) brightness(1.08) contrast(1.05);
  }

  /* --- Back link --- */
  .cyprus-back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: rgba(255,255,255,0.7);
    text-decoration: none;
    margin-bottom: 1rem;
    transition: color 0.2s;
  }
  .cyprus-back-link:hover {
    color: #fff;
  }

  /* --- Share section --- */
  .cyprus-share-section {
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(255,255,255,0.15);
    text-align: center;
  }

  .cyprus-share-label {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.6);
    margin-bottom: 0.75rem;
  }

  .cyprus-share-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .cyprus-share-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem;
    border-radius: 0.5rem;
    color: rgba(255,255,255,0.6);
    text-decoration: none;
    transition: transform 0.2s, color 0.2s;
  }
  .cyprus-share-btn:hover {
    transform: rotate(6deg);
    color: #fff;
  }

  .cyprus-tg-link {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.6);
    font-style: italic;
    text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .cyprus-tg-link a {
    color: rgba(255,255,255,0.85);
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: color 0.2s;
  }
  .cyprus-tg-link a:hover {
    color: #fff;
  }
`;
