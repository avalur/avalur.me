import { useState, useEffect, useCallback } from "react";
import NetworkCanvas from "./NetworkCanvas";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlurRegion {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface DataQuestion {
  title: string;
  image: string;
  options: [string, string, string, string];
  correct: number;
  hint?: string;
  blurRegions?: BlurRegion[];
  imageScale?: number; // 0-1, e.g. 0.8 = 80% width
  orientation?: "landscape" | "portrait"; // default: landscape
}

interface DataQuizGameProps {
  questions: DataQuestion[];
  gameName: string;
  onBack?: () => void;
}

type AnswerState = "idle" | "selected" | "revealed";

const LETTER_LABELS = ["A", "B", "C", "D"];

// ─── Sound ───────────────────────────────────────────────────────────────────

let globalAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (globalAudioCtx && globalAudioCtx.state !== "closed") {
    if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();
    return globalAudioCtx;
  }
  try {
    globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return globalAudioCtx;
  } catch {
    return null;
  }
}

function playTone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playSoundEffect(name: "select" | "correct" | "wrong") {
  const ctx = getAudioCtx();
  if (!ctx) return;
  switch (name) {
    case "select":
      playTone(ctx, 440, 0.3, "triangle");
      setTimeout(() => { const c = getAudioCtx(); if (c) playTone(c, 554, 0.3, "triangle"); }, 150);
      break;
    case "correct":
      playTone(ctx, 523, 0.15, "sine", 0.2);
      setTimeout(() => { const c = getAudioCtx(); if (c) playTone(c, 659, 0.15, "sine", 0.2); }, 100);
      setTimeout(() => { const c = getAudioCtx(); if (c) playTone(c, 784, 0.3, "sine", 0.2); }, 200);
      break;
    case "wrong":
      playTone(ctx, 300, 0.4, "sawtooth", 0.12);
      setTimeout(() => { const c = getAudioCtx(); if (c) playTone(c, 250, 0.5, "sawtooth", 0.12); }, 200);
      break;
  }
}

// ─── Background music ────────────────────────────────────────────────────────

let bgAudio: HTMLAudioElement | null = null;

function startBgMusic() {
  if (!bgAudio) {
    bgAudio = new Audio("/quiz/bg-music.mp3");
    bgAudio.loop = true;
    bgAudio.volume = 0.25;
  }
  bgAudio.play().catch(() => {});
}

function stopBgMusic() {
  if (!bgAudio) return;
  bgAudio.pause();
  bgAudio.currentTime = 0;
}

// ─── Theme helper ────────────────────────────────────────────────────────────

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.getAttribute("data-theme") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute("data-theme") || "dark";
      setTheme(t);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}

// ─── Heroes ──────────────────────────────────────────────────────────────────

interface Hero {
  title: string;
  name: string;
  image: string;
  description: string;
}

const HEROES: { min: number; hero: Hero }[] = [
  {
    min: 0,
    hero: {
      title: "Data Viz Apprentice",
      name: "Florence Nightingale",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Florence_Nightingale_%28H_Hering_NPG_x82368%29.jpg/400px-Florence_Nightingale_%28H_Hering_NPG_x82368%29.jpg",
      description: "Pioneer of data visualization — her famous polar area diagram (1858) convinced the British government to improve sanitary conditions in military hospitals. Every journey starts with a first chart!",
    },
  },
  {
    min: 4,
    hero: {
      title: "Data Detective",
      name: "John Snow",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/John_Snow.jpg/400px-John_Snow.jpg",
      description: "Plotted cholera cases on a map of London (1854) and traced the epidemic to a water pump on Broad Street. Proof that data saves lives!",
    },
  },
  {
    min: 7,
    hero: {
      title: "Chart Architect",
      name: "William Playfair",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Playfair_Barchart.gif/500px-Playfair_Barchart.gif",
      description: "Inventor of the bar chart and pie chart (1786). Without him, half of our graphs simply wouldn't exist. You're building a solid foundation!",
    },
  },
  {
    min: 10,
    hero: {
      title: "Visualization Master",
      name: "Charles Joseph Minard",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Minard.png/500px-Minard.png",
      description: "His map of Napoleon's 1812 Russian campaign (1869) is called \"the best statistical graphic ever drawn\" by Edward Tufte. You see stories in data!",
    },
  },
  {
    min: 12,
    hero: {
      title: "Statistical Visionary",
      name: "John Tukey",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Boxplot_vs_PDF.svg/500px-Boxplot_vs_PDF.svg.png",
      description: "Invented the box plot, coined the word \"software\", and co-created the FFT algorithm. His motto: \"An approximate answer to the right question is worth more than an exact answer to the wrong one.\"",
    },
  },
  {
    min: 14,
    hero: {
      title: "The Gauss of Data Analysis",
      name: "Carl Friedrich Gauss",
      image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Carl_Friedrich_Gauss_1840_by_Jensen.jpg/400px-Carl_Friedrich_Gauss_1840_by_Jensen.jpg",
      description: "At age 24, he predicted the exact position of the dwarf planet Ceres from minimal observations using the method of least squares. Legendary precision — just like yours!",
    },
  },
];

function getHero(correctCount: number): Hero {
  let result = HEROES[0].hero;
  for (const entry of HEROES) {
    if (correctCount >= entry.min) result = entry.hero;
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DataQuizGame({ questions, gameName, onBack }: DataQuizGameProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(questions.length).fill(null));
  const [revealed, setRevealed] = useState<boolean[]>(() => Array(questions.length).fill(false));
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [showResult, setShowResult] = useState(false);

  // Lifelines (per game)
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedAudience, setUsedAudience] = useState(false);
  const [removedOptions, setRemovedOptions] = useState<number[][]>(() => Array(questions.length).fill([]));
  const [showAudience, setShowAudience] = useState(false);
  const [audienceData, setAudienceData] = useState<number[]>([]);

  // Sound (muted controls background music only; SFX always play)
  const [muted, setMuted] = useState(false);

  // Theme
  const { theme, toggle: toggleTheme } = useTheme();

  // Background music
  useEffect(() => {
    if (!showResult && !muted) {
      startBgMusic();
    } else {
      stopBgMusic();
    }
    return () => { stopBgMusic(); };
  }, [showResult, muted]);

  const playSound = useCallback((name: "select" | "correct" | "wrong") => {
    playSoundEffect(name);
  }, []);

  const q = questions[currentQ];
  const isRevealed = revealed[currentQ];
  const selectedAnswer = answers[currentQ];
  const currentRemoved = removedOptions[currentQ];

  const handleAnswer = (index: number) => {
    if (isRevealed || answerState !== "idle" || currentRemoved.includes(index)) return;
    getAudioCtx();

    // Step 1: select (orange pulse)
    const newAnswers = [...answers];
    newAnswers[currentQ] = index;
    setAnswers(newAnswers);
    setAnswerState("selected");
    playSound("select");

    // Step 2: reveal after delay
    setTimeout(() => {
      const newRevealed = [...revealed];
      newRevealed[currentQ] = true;
      setRevealed(newRevealed);
      setAnswerState("revealed");
      setShowAudience(false);
      playSound(index === q.correct ? "correct" : "wrong");

      // Step 3: unlock navigation after a short pause
      setTimeout(() => setAnswerState("idle"), 500);
    }, 1500);
  };

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < questions.length && answerState === "idle") {
      setCurrentQ(idx);
      setShowAudience(false);
    }
  };

  // ─── Lifelines ──────────────────────────────────────────────────────────────

  const useFiftyFifty = () => {
    if (usedFiftyFifty || isRevealed || answerState !== "idle") return;
    setUsedFiftyFifty(true);
    const wrong = q.options
      .map((_, i) => i)
      .filter((i) => i !== q.correct);
    const shuffled = wrong.sort(() => Math.random() - 0.5);
    const newRemoved = [...removedOptions];
    newRemoved[currentQ] = [shuffled[0], shuffled[1]];
    setRemovedOptions(newRemoved);
  };

  const useAudience = () => {
    if (usedAudience || isRevealed || answerState !== "idle") return;
    setUsedAudience(true);
    const data = [0, 0, 0, 0];
    const correctWeight = 40 + Math.random() * 35;
    data[q.correct] = correctWeight;
    let remaining = 100 - correctWeight;
    for (let i = 0; i < 4; i++) {
      if (i === q.correct) continue;
      if (currentRemoved.includes(i)) { data[i] = 0; continue; }
      const portion = i === 3 || (i === 2 && currentRemoved.length > 0)
        ? remaining : Math.random() * remaining;
      data[i] = Math.round(portion);
      remaining -= data[i];
    }
    const sum = data.reduce((a, b) => a + b, 0);
    if (sum !== 100) data[q.correct] += 100 - sum;
    setAudienceData(data);
    setShowAudience(true);
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const correctCount = answers.reduce<number>(
    (sum, ans, i) => sum + (ans === questions[i].correct ? 1 : 0), 0
  );
  const answeredCount = revealed.filter(Boolean).length;
  const allAnswered = answeredCount === questions.length;

  // ─── Result screen ──────────────────────────────────────────────────────────

  if (showResult) {
    const hero = getHero(correctCount);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-lg w-full space-y-6">
          {/* Score */}
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--quiz-text-dim)" }}>{gameName}</h1>
            <div className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              {correctCount}/{questions.length}
            </div>
          </div>

          {/* Hero card */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{
              backgroundColor: "var(--quiz-panel)",
              border: "1px solid var(--quiz-border-medium)",
            }}
          >
            <p className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--quiz-accent)" }}>
              {hero.title}
            </p>
            <div className="flex justify-center">
              <img
                src={hero.image}
                alt={hero.name}
                className="max-w-72 md:max-w-96 rounded-xl object-contain shadow-lg"
                style={{ border: "2px solid var(--quiz-border-medium)" }}
              />
            </div>
            <h2 className="text-xl md:text-2xl font-bold" style={{ color: "var(--quiz-text)" }}>
              {hero.name}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--quiz-text-secondary)" }}>
              {hero.description}
            </p>
          </div>

          {/* Share */}
          <ShareButtons correctCount={correctCount} total={questions.length} heroTitle={hero.title} />

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => { setShowResult(false); setCurrentQ(0); }}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg"
            >
              Review Answers
            </button>
            <button
              onClick={() => {
                setAnswers(Array(questions.length).fill(null));
                setRevealed(Array(questions.length).fill(false));
                setRemovedOptions(Array(questions.length).fill([]));
                setUsedFiftyFifty(false);
                setUsedAudience(false);
                setShowAudience(false);
                setCurrentQ(0);
                setShowResult(false);
              }}
              className="w-full px-6 py-3 rounded-lg border-2 font-bold transition-all"
              style={{
                borderColor: "var(--quiz-border-strong)",
                color: "var(--quiz-text-secondary)",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
        <BottomButtons muted={muted} setMuted={setMuted} theme={theme} toggleTheme={toggleTheme} />
      </div>
    );
  }

  // ─── Game screen ────────────────────────────────────────────────────────────

  const getOptionStyle = (index: number): React.CSSProperties => {
    if (currentRemoved.includes(index)) {
      return {
        borderColor: "var(--quiz-disabled-border)",
        backgroundColor: "var(--quiz-disabled-bg)",
        color: "var(--quiz-disabled-text)",
        cursor: "not-allowed",
        opacity: 0.3,
      };
    }
    if (isRevealed) {
      if (index === q.correct) return { borderColor: "#4ade80", backgroundColor: "rgba(34,197,94,0.2)", color: "#86efac", boxShadow: "0 0 20px rgba(74,222,128,0.3)" };
      if (index === selectedAnswer) return { borderColor: "#f87171", backgroundColor: "rgba(239,68,68,0.2)", color: "#fca5a5", boxShadow: "0 0 20px rgba(248,113,113,0.3)" };
      return { borderColor: "var(--quiz-disabled-border)", backgroundColor: "var(--quiz-disabled-bg)", color: "var(--quiz-disabled-text)" };
    }
    if (answerState === "selected" && index === selectedAnswer) {
      return { borderColor: "#fb923c", backgroundColor: "rgba(249,115,22,0.2)", color: "#fdba74" };
    }
    return {
      borderColor: "var(--quiz-border-strong)",
      color: "var(--quiz-option-text)",
    };
  };

  const canNavigate = answerState === "idle";
  const isPortrait = q.orientation === "portrait";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden w-full">
      {/* Left sidebar — question list with titles */}
      <div
        className="hidden lg:flex flex-col w-64 shrink-0 overflow-y-auto"
        style={{
          backgroundColor: "var(--quiz-sidebar-bg)",
          borderRight: "1px solid var(--quiz-border)",
        }}
      >
        <div className="p-3" style={{ borderBottom: "1px solid var(--quiz-border)" }}>
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs transition-colors mb-2"
              style={{ color: "var(--quiz-text-dim)" }}
            >
              &larr; Back
            </button>
          )}
          <h3 className="text-xs uppercase tracking-wide font-bold" style={{ color: "var(--quiz-accent)" }}>{gameName}</h3>
          <p className="text-xs mt-1" style={{ color: "var(--quiz-text-dimmer)" }}>{correctCount}/{answeredCount} correct</p>
        </div>
        <div className="flex-1 p-2 space-y-0.5">
          {questions.map((question, idx) => {
            const isCurrent = idx === currentQ;
            const isAnswered = revealed[idx];
            const isCorrect = answers[idx] === question.correct;

            const itemStyle: React.CSSProperties = isCurrent
              ? { backgroundColor: "var(--quiz-sidebar-active)", color: "var(--quiz-text)", fontWeight: "bold" }
              : isAnswered && isCorrect
              ? { color: "#4ade80" }
              : isAnswered
              ? { color: "#f87171" }
              : { color: "var(--quiz-text-dim)" };

            return (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                disabled={!canNavigate}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all text-left ${
                  !canNavigate && !isCurrent ? "opacity-50 cursor-not-allowed" : ""
                }`}
                style={itemStyle}
              >
                <span className="shrink-0 w-5 text-xs text-right opacity-60">{idx + 1}.</span>
                <span className="truncate flex-1">{question.title}</span>
                {isAnswered && (
                  <span className="shrink-0 text-xs">{isCorrect ? "✓" : "✗"}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 font-bold" style={{ color: "var(--quiz-text-secondary)" }}>
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden text-sm transition-colors"
                style={{ color: "var(--quiz-text-dim)" }}
              >
                &larr;
              </button>
            )}
            <span className="text-lg" style={{ color: "var(--quiz-text)" }}>{currentQ + 1}</span>
            <span style={{ color: "var(--quiz-text-dim)" }}>/{questions.length}</span>
            <span className="lg:hidden ml-3 text-sm" style={{ color: "var(--quiz-text-dim)" }}>
              {correctCount}/{answeredCount} correct
            </span>
          </div>

          {/* Lifelines */}
          <div className="flex gap-2">
            <LifelineButton
              label="50:50"
              used={usedFiftyFifty}
              onClick={useFiftyFifty}
              disabled={isRevealed || answerState !== "idle"}
            />
            <LifelineButton
              label="&#x1F465;"
              title="Ask the Audience"
              used={usedAudience}
              onClick={useAudience}
              disabled={isRevealed || answerState !== "idle"}
            />
          </div>
        </div>

        {/* Portrait: image left + options right on desktop. Landscape: stacked */}
        <div className={`flex flex-col flex-1 ${isPortrait ? "xl:flex-row xl:items-center xl:gap-6" : ""}`}>
          {/* Question image */}
          <div className={`flex justify-center mb-4 ${isPortrait ? "xl:mb-0 xl:w-1/2 xl:shrink-0" : ""}`}>
            <div
              className="rounded-xl overflow-hidden relative self-start"
              style={{
                width: q.imageScale ? `${q.imageScale * 100}%` : "100%",
                backgroundColor: "var(--quiz-image-bg)",
                border: "1px solid var(--quiz-border)",
              }}
            >
              <img
                src={q.image}
                alt={`Question ${currentQ + 1}`}
                className="w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<div class="flex items-center justify-center h-64 text-6xl" style="color: var(--quiz-text-dim)">?</div>`;
                }}
              />
              {q.blurRegions?.map((region, i) => (
                <div
                  key={i}
                  className="absolute transition-all duration-700 pointer-events-none"
                  style={{
                    top: `${region.top}%`,
                    left: `${region.left}%`,
                    width: `${region.width}%`,
                    height: `${region.height}%`,
                    backdropFilter: isRevealed ? "blur(0px)" : "blur(12px)",
                    WebkitBackdropFilter: isRevealed ? "blur(0px)" : "blur(12px)",
                    backgroundColor: isRevealed ? "transparent" : "var(--quiz-blur-bg)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Options */}
          <div className={isPortrait ? "xl:w-1/2 xl:flex xl:flex-col xl:justify-center" : ""}>
            {/* Options */}
            <div className={`grid gap-3 mb-4 ${isPortrait ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={isRevealed || answerState !== "idle" || currentRemoved.includes(i)}
                  className={`option-btn relative overflow-hidden flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all duration-300 w-full ${
                    answerState === "selected" && i === selectedAnswer && !isRevealed ? "animate-pulse" : ""
                  } ${!isRevealed && answerState === "idle" && !currentRemoved.includes(i) ? "hover:brightness-110 cursor-pointer" : ""}`}
                  style={getOptionStyle(i)}
                >
                  <NetworkCanvas nodeCount={15} className="rounded-lg" />
                  <span className="relative z-10 font-bold text-sm shrink-0 w-6" style={{ color: "var(--quiz-option-label)" }}>
                    {LETTER_LABELS[i]}:
                  </span>
                  <span className="relative z-10 text-sm md:text-base">{opt}</span>
                </button>
              ))}
            </div>

            {/* Audience chart */}
            {showAudience && !isRevealed && (
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: "var(--quiz-panel-solid)",
                  border: "1px solid var(--quiz-border-medium)",
                }}
              >
                <p className="text-sm mb-3 text-center font-bold" style={{ color: "var(--quiz-text-secondary)" }}>Audience Poll Results:</p>
                <div className="flex items-end justify-center gap-4 h-32">
                  {audienceData.map((pct, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-xs" style={{ color: "var(--quiz-text-secondary)" }}>{Math.round(pct)}%</span>
                      <div
                        className="w-10 bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t transition-all duration-500"
                        style={{
                          height: `${Math.max(pct, 2)}%`,
                          opacity: currentRemoved.includes(i) ? 0.2 : 1,
                        }}
                      />
                      <span className="text-xs font-bold" style={{ color: "var(--quiz-accent)" }}>{LETTER_LABELS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => goTo(currentQ - 1)}
                disabled={currentQ === 0 || !canNavigate}
                className="flex-1 px-4 py-3 rounded-lg font-bold text-base transition-all border-2"
                style={
                  currentQ === 0 || !canNavigate
                    ? { borderColor: "var(--quiz-disabled-border)", backgroundColor: "var(--quiz-disabled-bg)", color: "var(--quiz-disabled-text)", cursor: "not-allowed" }
                    : { borderColor: "var(--quiz-border-strong)", color: "var(--quiz-text-secondary)" }
                }
              >
                ← Previous
              </button>
              {currentQ === questions.length - 1 && allAnswered ? (
                <button
                  onClick={() => setShowResult(true)}
                  disabled={!canNavigate}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-base hover:from-green-500 hover:to-emerald-500 transition-all shadow-lg"
                >
                  Finish →
                </button>
              ) : (
                <button
                  onClick={() => goTo(currentQ + 1)}
                  disabled={currentQ === questions.length - 1 || !canNavigate}
                  className="flex-1 px-4 py-3 rounded-lg font-bold text-base transition-all border-2"
                  style={
                    currentQ === questions.length - 1 || !canNavigate
                      ? { borderColor: "var(--quiz-disabled-border)", backgroundColor: "var(--quiz-disabled-bg)", color: "var(--quiz-disabled-text)", cursor: "not-allowed" }
                      : { borderColor: "var(--quiz-border-strong)", color: "var(--quiz-text-secondary)" }
                  }
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <BottomButtons muted={muted} setMuted={setMuted} theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BottomButtons({ muted, setMuted, theme, toggleTheme }: {
  muted: boolean; setMuted: (v: boolean) => void;
  theme: string; toggleTheme: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 flex gap-2 z-50">
      <button
        onClick={toggleTheme}
        className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
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
      <button
        onClick={() => { getAudioCtx(); setMuted(!muted); }}
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all"
        style={{
          background: "var(--quiz-panel-solid)",
          border: "1px solid var(--quiz-border-medium)",
          color: "var(--quiz-text-secondary)",
        }}
        title={muted ? "Unmute" : "Mute"}
      >
        {muted ? "\u{1F507}" : "\u{1F509}"}
      </button>
    </div>
  );
}

const QUIZ_URL = "https://avalur.me/data-viz-quiz/";

const SHARE_ICONS = {
  x: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  telegram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  ),
  facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  email: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
};

function ShareButtons({ correctCount, total, heroTitle }: { correctCount: number; total: number; heroTitle: string }) {
  const text = `I scored ${correctCount}/${total} on the Data Viz Quiz and earned the "${heroTitle}" title! Can you beat me?`;
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(QUIZ_URL);

  const links = [
    { name: "X", icon: SHARE_ICONS.x, href: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}` },
    { name: "LinkedIn", icon: SHARE_ICONS.linkedin, href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedText}` },
    { name: "Telegram", icon: SHARE_ICONS.telegram, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { name: "Facebook", icon: SHARE_ICONS.facebook, href: `https://www.facebook.com/sharer.php?u=${encodedUrl}&quote=${encodedText}` },
    { name: "Email", icon: SHARE_ICONS.email, href: `mailto:?subject=${encodeURIComponent("Data Viz Quiz Result")}&body=${encodedText}%0A${encodedUrl}` },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm" style={{ color: "var(--quiz-text-dim)" }}>Share your result:</p>
      <div className="flex justify-center gap-2">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Share on ${link.name}`}
            className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110"
            style={{
              color: "var(--quiz-text-secondary)",
              border: "1px solid var(--quiz-border-medium)",
              backgroundColor: "var(--quiz-panel)",
            }}
          >
            {link.icon}
          </a>
        ))}
      </div>
    </div>
  );
}

function LifelineButton({
  label, title, used, onClick, disabled,
}: {
  label: string; title?: string; used: boolean; onClick: () => void; disabled: boolean;
}) {
  const style: React.CSSProperties = used
    ? { borderColor: "var(--quiz-disabled-border)", backgroundColor: "var(--quiz-disabled-bg)", color: "var(--quiz-disabled-text)", cursor: "not-allowed", textDecoration: "line-through" }
    : disabled
    ? { borderColor: "var(--quiz-border-medium)", backgroundColor: "var(--quiz-panel)", color: "var(--quiz-text-dimmer)", cursor: "not-allowed" }
    : { borderColor: "var(--quiz-border-strong)", backgroundColor: "var(--quiz-panel)", color: "var(--quiz-text-secondary)", cursor: "pointer" };

  return (
    <button
      onClick={onClick}
      disabled={used || disabled}
      title={title || label}
      className="w-12 h-12 rounded-full border-2 text-sm font-bold transition-all flex items-center justify-center"
      style={style}
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}
