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
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Data Visualization Quiz
          </h1>
          <p className="text-indigo-300 text-sm mt-2">
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
      </div>
    </div>
  );
}
