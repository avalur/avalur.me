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
    transform-style: preserve-3d;
  }

  .cyprus-card-inner.is-flipped {
    transform: rotateY(180deg);
  }

  /* --- Face (shared) --- */
  .cyprus-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    border-radius: 1rem;
    overflow: hidden;
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
    padding-top: 30%;
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
`;
