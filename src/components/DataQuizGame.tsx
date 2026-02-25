import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BlurRegion {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Question {
  question: string;
  image: string;
  options: [string, string, string, string];
  correct: number;
  hint?: string;
  blurRegions?: BlurRegion[];
}

export interface DataQuestion extends Question {
  title: string;
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

  // Sound
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

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
    if (mutedRef.current) return;
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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-3">
            <div className="text-5xl">
              {correctCount === questions.length ? "\uD83C\uDFC6" : correctCount >= 10 ? "\uD83C\uDF89" : correctCount >= 5 ? "\uD83D\uDC4D" : "\uD83D\uDCDA"}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{gameName}</h1>
            <div className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              {correctCount}/{questions.length}
            </div>
            <p className="text-indigo-300 text-lg">correct answers</p>
          </div>
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
              className="w-full px-6 py-3 rounded-lg border-2 border-indigo-500/40 text-indigo-300 font-bold hover:border-indigo-400 hover:bg-indigo-950/40 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
        <MuteButton muted={muted} setMuted={setMuted} />
      </div>
    );
  }

  // ─── Game screen ────────────────────────────────────────────────────────────

  const getOptionClass = (index: number) => {
    const base =
      "option-btn flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all duration-300 w-full";

    if (currentRemoved.includes(index)) {
      return `${base} border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-30`;
    }

    if (isRevealed) {
      if (index === q.correct) return `${base} border-green-400 bg-green-500/20 text-green-300 shadow-[0_0_20px_rgba(74,222,128,0.3)]`;
      if (index === selectedAnswer) return `${base} border-red-400 bg-red-500/20 text-red-300 shadow-[0_0_20px_rgba(248,113,113,0.3)]`;
      return `${base} border-gray-700 bg-gray-800/20 text-gray-500`;
    }

    if (answerState === "selected" && index === selectedAnswer) {
      return `${base} border-orange-400 bg-orange-500/20 text-orange-300 animate-pulse`;
    }

    return `${base} border-indigo-500/40 bg-indigo-950/40 text-gray-200 hover:border-indigo-400 hover:bg-indigo-900/40 cursor-pointer`;
  };

  const canNavigate = answerState === "idle";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left sidebar — question list with titles */}
      <div className="hidden lg:flex flex-col w-64 shrink-0 bg-indigo-950/30 border-r border-indigo-500/20 overflow-y-auto">
        <div className="p-3 border-b border-indigo-500/20">
          {onBack && (
            <button
              onClick={onBack}
              className="text-xs text-indigo-400/60 hover:text-indigo-300 transition-colors mb-2"
            >
              &larr; Back
            </button>
          )}
          <h3 className="text-xs text-indigo-400 uppercase tracking-wide font-bold">{gameName}</h3>
          <p className="text-xs text-indigo-400/50 mt-1">{correctCount}/{answeredCount} correct</p>
        </div>
        <div className="flex-1 p-2 space-y-0.5">
          {questions.map((question, idx) => {
            const isCurrent = idx === currentQ;
            const isAnswered = revealed[idx];
            const isCorrect = answers[idx] === question.correct;

            return (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                disabled={!canNavigate}
                className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all text-left ${
                  isCurrent
                    ? "bg-indigo-600/60 text-white font-bold"
                    : isAnswered && isCorrect
                    ? "text-green-400/80 hover:bg-indigo-900/30"
                    : isAnswered
                    ? "text-red-400/80 hover:bg-indigo-900/30"
                    : "text-indigo-400/60 hover:bg-indigo-900/30"
                } ${!canNavigate && !isCurrent ? "opacity-50 cursor-not-allowed" : ""}`}
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
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-indigo-300 font-bold">
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden text-sm text-indigo-400/60 hover:text-indigo-300 transition-colors"
              >
                &larr;
              </button>
            )}
            <span className="text-white text-lg">{currentQ + 1}</span>
            <span className="text-indigo-400/60">/{questions.length}</span>
            <span className="lg:hidden ml-3 text-indigo-400/60 text-sm">
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

        {/* Desktop: image left, question+options right. Mobile: stacked */}
        <div className="flex flex-col xl:flex-row xl:items-center xl:gap-6 flex-1">
          {/* Question image */}
          <div className="flex justify-center mb-4 xl:mb-0 xl:w-1/2 xl:shrink-0">
            <div className="w-full rounded-xl overflow-hidden bg-indigo-950/40 border border-indigo-500/20 relative self-start">
              <img
                src={q.image}
                alt={`Question ${currentQ + 1}`}
                className="w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.innerHTML =
                    `<div class="flex items-center justify-center h-64 text-indigo-400/40 text-6xl">?</div>`;
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
                    backgroundColor: isRevealed ? "transparent" : "rgba(10, 14, 39, 0.3)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Question text + options */}
          <div className="xl:w-1/2 xl:flex xl:flex-col xl:justify-center">
            {/* Question text */}
            <div className="text-center xl:text-left mb-4">
              <div className="inline-block bg-indigo-950/60 border border-indigo-500/30 rounded-xl px-6 py-4">
                <p className="text-white text-lg md:text-xl font-medium leading-relaxed">
                  {q.question}
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3 mb-4">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={isRevealed || answerState !== "idle" || currentRemoved.includes(i)}
                  className={getOptionClass(i)}
                >
                  <span className="text-indigo-400 font-bold text-sm shrink-0 w-6">
                    {LETTER_LABELS[i]}:
                  </span>
                  <span className="text-sm md:text-base">{opt}</span>
                </button>
              ))}
            </div>

            {/* Audience chart */}
            {showAudience && !isRevealed && (
              <div className="bg-indigo-950/80 border border-indigo-500/30 rounded-xl p-4 mb-4">
                <p className="text-indigo-300 text-sm mb-3 text-center font-bold">Audience Poll Results:</p>
                <div className="flex items-end justify-center gap-4 h-32">
                  {audienceData.map((pct, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="text-xs text-indigo-300">{Math.round(pct)}%</span>
                      <div
                        className="w-10 bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t transition-all duration-500"
                        style={{
                          height: `${Math.max(pct, 2)}%`,
                          opacity: currentRemoved.includes(i) ? 0.2 : 1,
                        }}
                      />
                      <span className="text-xs text-indigo-400 font-bold">{LETTER_LABELS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hint removed — no longer shown after answer */}

            {/* Navigation buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => goTo(currentQ - 1)}
                disabled={currentQ === 0 || !canNavigate}
                className={`flex-1 px-4 py-3 rounded-lg font-bold text-base transition-all ${
                  currentQ === 0 || !canNavigate
                    ? "border-2 border-gray-700 bg-gray-800/20 text-gray-600 cursor-not-allowed"
                    : "border-2 border-indigo-500/40 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-950/40"
                }`}
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
                  className={`flex-1 px-4 py-3 rounded-lg font-bold text-base transition-all ${
                    currentQ === questions.length - 1 || !canNavigate
                      ? "border-2 border-gray-700 bg-gray-800/20 text-gray-600 cursor-not-allowed"
                      : "border-2 border-indigo-500/40 text-indigo-300 hover:border-indigo-400 hover:bg-indigo-950/40"
                  }`}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <MuteButton muted={muted} setMuted={setMuted} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MuteButton({ muted, setMuted }: { muted: boolean; setMuted: (v: boolean) => void }) {
  return (
    <button
      onClick={() => { getAudioCtx(); setMuted(!muted); }}
      className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 hover:text-white hover:border-indigo-400 transition-all flex items-center justify-center text-lg z-50"
      title={muted ? "Unmute" : "Mute"}
    >
      {muted ? "\u{1F507}" : "\u{1F509}"}
    </button>
  );
}

function LifelineButton({
  label, title, used, onClick, disabled,
}: {
  label: string; title?: string; used: boolean; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={used || disabled}
      title={title || label}
      className={`w-12 h-12 rounded-full border-2 text-sm font-bold transition-all flex items-center justify-center ${
        used
          ? "border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed line-through"
          : disabled
          ? "border-indigo-500/30 bg-indigo-950/40 text-indigo-400/50 cursor-not-allowed"
          : "border-indigo-500/50 bg-indigo-950/60 text-indigo-300 hover:border-indigo-400 hover:text-white cursor-pointer"
      }`}
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}
