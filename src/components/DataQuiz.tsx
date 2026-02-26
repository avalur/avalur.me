import { useState } from "react";
import DataQuizGame from "./DataQuizGame";
import { GAME1_QUESTIONS, GAME2_QUESTIONS } from "../data/dataQuizQuestions";

type GameChoice = null | 1 | 2;

export default function DataQuiz() {
  const [game, setGame] = useState<GameChoice>(null);

  if (game === 1) {
    return (
      <DataQuizGame
        questions={GAME1_QUESTIONS}
        gameName="Maps & Charts"
        onBack={() => setGame(null)}
      />
    );
  }

  if (game === 2) {
    return (
      <DataQuizGame
        questions={GAME2_QUESTIONS}
        gameName="People & Patterns"
        onBack={() => setGame(null)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-lg w-full space-y-8">
        <div className="space-y-4">
          <div className="text-6xl">&#x1F4CA;</div>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "var(--quiz-text)" }}>
            Data Visualization Quiz
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--quiz-text-secondary)" }}>
            Guess what's shown on charts, maps, and visualizations
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setGame(1)}
            className="w-full px-6 py-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-indigo-500/25 border-2 border-transparent"
          >
            <div className="text-xl mb-1">&#x1F5FA; Game 1: Maps &amp; Charts</div>
            <div className="text-sm font-normal text-indigo-200/80">
              Geographic maps, heatmaps, and statistical charts
            </div>
          </button>

          <button
            onClick={() => setGame(2)}
            className="w-full px-6 py-5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg hover:shadow-purple-500/25 border-2 border-transparent"
          >
            <div className="text-xl mb-1">&#x1F465; Game 2: People &amp; Patterns</div>
            <div className="text-sm font-normal text-purple-200/80">
              Cultural data, behavioral patterns, and unusual datasets
            </div>
          </button>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: "var(--quiz-text-dim)" }}>
          Inspired by a game from the excellent{" "}
          <a
            href="https://www.youtube.com/watch?v=VEs6xbkaH7A&list=PLaRUeIuewv8CMFox0oEjlyePUhUmo-x0h"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
            style={{ color: "var(--quiz-text-secondary)" }}
          >
            Data Analysis course
          </a>{" "}
          by Alexander Dyakonov (in Russian)
        </p>
      </div>
      <ThemeToggleButton />
    </div>
  );
}

function ThemeToggleButton() {
  const [theme, setTheme] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") || "dark";
    }
    return "dark";
  });

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all z-50"
      style={{
        background: "var(--quiz-panel-solid)",
        border: "1px solid var(--quiz-border-medium)",
        color: "var(--quiz-text-secondary)",
      }}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
