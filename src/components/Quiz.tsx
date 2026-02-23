import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Question {
  question: string;
  image: string;
  options: [string, string, string, string];
  correct: number;
  hint?: string;
}

interface LeaderboardEntry {
  name: string;
  amount: string;
  questionIndex: number;
  date: string;
}

type Screen = "welcome" | "game" | "result";
type AnswerState = "idle" | "selected" | "revealed";

// ─── Constants ───────────────────────────────────────────────────────────────

const AMOUNTS = [
  "100", "200", "300", "500", "1,000",
  "2,000", "4,000", "8,000", "16,000", "32,000",
  "64,000", "125,000", "250,000", "500,000", "1,000,000",
];

const SAFE_HAVENS = [4, 9];

const QUESTIONS: Question[] = [
  {
    question: "Which programming language was created by Guido van Rossum in 1991?",
    image: "/quiz/q1.webp",
    options: ["Java", "Python", "C++", "Ruby"],
    correct: 1,
    hint: "My programmer friend says it's named after the comedy group Monty Python. He's 90% sure it's Python.",
  },
  {
    question: "How many bits are in one byte?",
    image: "/quiz/q2.webp",
    options: ["4", "8", "16", "32"],
    correct: 1,
    hint: "My friend says: 'It's definitely 8, I'm 100% sure!'",
  },
  {
    question: "Which data structure operates on the LIFO principle?",
    image: "/quiz/q3.webp",
    options: ["Queue", "Stack", "Tree", "Graph"],
    correct: 1,
    hint: "Friend says: 'LIFO — Last In, First Out. It's a stack, like a pile of plates!'",
  },
  {
    question: "Which number system do computers use internally?",
    image: "/quiz/q4.webp",
    options: ["Decimal", "Octal", "Binary", "Hexadecimal"],
    correct: 2,
    hint: "Friend says: 'Computers only understand 0 and 1, so it's binary. 95% sure.'",
  },
  {
    question: "Who is considered the father of computer science and proposed the concept of a universal computing machine?",
    image: "/quiz/q5.webp",
    options: ["John von Neumann", "Alan Turing", "Charles Babbage", "Claude Shannon"],
    correct: 1,
    hint: "Friend says: 'That's Alan Turing — the Turing Test is named after him. 85% sure.'",
  },
  {
    question: "Which sorting algorithm has average complexity O(n log n) and uses a divide-and-conquer strategy?",
    image: "/quiz/q6.webp",
    options: ["Bubble Sort", "Quick Sort", "Insertion Sort", "Selection Sort"],
    correct: 1,
    hint: "My programmer friend says: 'Quick Sort — it's in the name. 90% sure.'",
  },
  {
    question: "What does the abbreviation SQL stand for?",
    image: "/quiz/q7.webp",
    options: ["Strong Query Logic", "Structured Query Language", "Simple Question Language", "System Quality Level"],
    correct: 1,
    hint: "Friend says: 'Structured Query Language. That's for sure.'",
  },
  {
    question: "Which protocol provides secure (encrypted) data transmission on the internet?",
    image: "/quiz/q8.webp",
    options: ["HTTP", "FTP", "HTTPS", "SMTP"],
    correct: 2,
    hint: "Friend says: 'HTTPS is HTTP with an S for Secure. 95% sure.'",
  },
  {
    question: "What is the time complexity of binary search in a sorted array?",
    image: "/quiz/q9.webp",
    options: ["O(n)", "O(n\u00B2)", "O(log n)", "O(1)"],
    correct: 2,
    hint: "Friend says: 'Each time we split in half, so it's logarithmic. O(log n), 90% sure.'",
  },
  {
    question: "In which year was the paper 'Attention Is All You Need' published, introducing the Transformer architecture?",
    image: "/quiz/q10.webp",
    options: ["2015", "2017", "2019", "2020"],
    correct: 1,
    hint: "Friend says: 'That was in 2017, a paper from Google. 80% sure.'",
  },
  {
    question: "Which of the following problems is NP-complete?",
    image: "/quiz/q11.webp",
    options: ["Array sorting", "Shortest path in a graph", "Travelling Salesman Problem", "Matrix multiplication"],
    correct: 2,
    hint: "Friend says: 'The Travelling Salesman Problem is a classic NP-complete example. 85% sure.'",
  },
  {
    question: "What mathematical problem underlies RSA encryption?",
    image: "/quiz/q12.webp",
    options: ["Factoring large numbers", "Discrete logarithm", "SHA-256 hashing", "Euclidean algorithm"],
    correct: 0,
    hint: "Friend says: 'RSA is based on the difficulty of factoring a product of two large primes. 75% sure.'",
  },
  {
    question: "What is the CAP theorem in distributed systems?",
    image: "/quiz/q13.webp",
    options: [
      "You can't have all three: consistency, availability, partition tolerance",
      "Every system must be: fast, reliable, scalable",
      "Data must be: confidential, authentic, complete",
      "An algorithm must be: correct, adaptive, parallel",
    ],
    correct: 0,
    hint: "Friend says: 'CAP — Consistency, Availability, Partition tolerance. You can't guarantee all three at once. 70% sure.'",
  },
  {
    question: "Which algorithm finds the median of an unsorted array in guaranteed linear time?",
    image: "/quiz/q14.webp",
    options: ["Quickselect (average case)", "Median of Medians", "Sort + index", "Heap-based approach"],
    correct: 1,
    hint: "Friend says: 'Median of medians guarantees O(n) worst case, but I'm not entirely sure... about 65%.'",
  },
  {
    question: "Which open problem in computer science has a $1,000,000 prize for its solution?",
    image: "/quiz/q15.webp",
    options: ["The Halting Problem", "P = NP?", "Turing Completeness", "Church's Hypothesis"],
    correct: 1,
    hint: "Friend says: 'P vs NP is one of the Millennium Prize Problems. If P=NP, you could break all encryption! 80% sure.'",
  },
];

const LETTER_LABELS = ["A", "B", "C", "D"];
const LEADERBOARD_KEY = "quiz-leaderboard";

// ─── Sound via Web Audio API ─────────────────────────────────────────────────

let globalAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (globalAudioCtx && globalAudioCtx.state !== "closed") {
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume();
    }
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

function playSoundEffect(name: "select" | "correct" | "wrong" | "win") {
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
    case "win":
      [523, 659, 784, 1047].forEach((f, i) => {
        setTimeout(() => { const c = getAudioCtx(); if (c) playTone(c, f, 0.3, "sine", 0.2); }, i * 150);
      });
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

// ─── Leaderboard helpers ─────────────────────────────────────────────────────

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    return [];
  }
}

function parseAmount(amount: string): number {
  return parseInt(amount.replace(/[,\s]/g, "")) || 0;
}

function deduplicateBoard(board: LeaderboardEntry[]): LeaderboardEntry[] {
  const best = new Map<string, LeaderboardEntry>();
  for (const entry of board) {
    const key = entry.name.toLowerCase();
    const existing = best.get(key);
    if (!existing || parseAmount(entry.amount) > parseAmount(existing.amount)) {
      best.set(key, entry);
    }
  }
  return Array.from(best.values());
}

function saveToLeaderboard(entry: LeaderboardEntry) {
  const board = loadLeaderboard();
  board.push(entry);
  const deduped = deduplicateBoard(board);
  deduped.sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount));
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(deduped.slice(0, 20)));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Quiz() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [playerName, setPlayerName] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [finalAmount, setFinalAmount] = useState("0");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Lifelines
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedAudience, setUsedAudience] = useState(false);
  const [usedPhone, setUsedPhone] = useState(false);
  const [removedOptions, setRemovedOptions] = useState<number[]>([]);
  const [showAudience, setShowAudience] = useState(false);
  const [audienceData, setAudienceData] = useState<number[]>([]);
  const [showPhone, setShowPhone] = useState(false);

  // Sound
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    const board = loadLeaderboard();
    const deduped = deduplicateBoard(board);
    if (deduped.length !== board.length) {
      deduped.sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount));
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(deduped.slice(0, 20)));
    }
    setLeaderboard(deduped);
  }, [screen]);

  // Start/stop bg music based on screen and mute state
  useEffect(() => {
    if (screen === "game" && !muted) {
      startBgMusic();
    } else {
      stopBgMusic();
    }
    return () => { stopBgMusic(); };
  }, [screen, muted]);

  const playSound = useCallback((name: "select" | "correct" | "wrong" | "win") => {
    if (mutedRef.current) return;
    playSoundEffect(name);
  }, []);

  const initAudio = useCallback(() => {
    getAudioCtx();
  }, []);

  const resetGame = useCallback(() => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setAnswerState("idle");
    setUsedFiftyFifty(false);
    setUsedAudience(false);
    setUsedPhone(false);
    setRemovedOptions([]);
    setShowAudience(false);
    setShowPhone(false);
  }, []);

  const startGame = () => {
    initAudio();
    resetGame();
    setScreen("game");
  };

  const getDisplayName = () => playerName.trim() || "Player";

  const getSafeHavenAmount = (questionIndex: number): string => {
    for (let i = SAFE_HAVENS.length - 1; i >= 0; i--) {
      if (questionIndex > SAFE_HAVENS[i]) return AMOUNTS[SAFE_HAVENS[i]];
    }
    return "0";
  };

  const handleAnswer = (index: number) => {
    if (answerState !== "idle" || removedOptions.includes(index)) return;

    setSelectedAnswer(index);
    setAnswerState("selected");
    playSound("select");

    setTimeout(() => {
      const q = QUESTIONS[currentQ];
      const isCorrect = index === q.correct;

      setAnswerState("revealed");

      if (isCorrect) {
        playSound("correct");

        setTimeout(() => {
          if (currentQ === QUESTIONS.length - 1) {
            playSound("win");
            const amount = AMOUNTS[currentQ];
            setFinalAmount(amount);
            saveToLeaderboard({
              name: getDisplayName(),
              amount,
              questionIndex: currentQ,
              date: new Date().toLocaleDateString("en-US"),
            });
            setScreen("result");
          } else {
            setCurrentQ((q) => q + 1);
            setSelectedAnswer(null);
            setAnswerState("idle");
            setRemovedOptions([]);
            setShowAudience(false);
            setShowPhone(false);
          }
        }, 1500);
      } else {
        playSound("wrong");

        setTimeout(() => {
          const amount = getSafeHavenAmount(currentQ);
          setFinalAmount(amount);
          saveToLeaderboard({
            name: getDisplayName(),
            amount,
            questionIndex: currentQ,
            date: new Date().toLocaleDateString("en-US"),
          });
          setScreen("result");
        }, 2000);
      }
    }, 1500);
  };

  // ─── Lifelines ─────────────────────────────────────────────────────────────

  const useFiftyFifty = () => {
    if (usedFiftyFifty || answerState !== "idle") return;
    setUsedFiftyFifty(true);
    const q = QUESTIONS[currentQ];
    const wrong = q.options
      .map((_, i) => i)
      .filter((i) => i !== q.correct);
    const shuffled = wrong.sort(() => Math.random() - 0.5);
    setRemovedOptions([shuffled[0], shuffled[1]]);
  };

  const useAudience = () => {
    if (usedAudience || answerState !== "idle") return;
    setUsedAudience(true);
    const q = QUESTIONS[currentQ];
    const data = [0, 0, 0, 0];
    const correctWeight = 40 + Math.random() * 35;
    data[q.correct] = correctWeight;
    let remaining = 100 - correctWeight;
    for (let i = 0; i < 4; i++) {
      if (i === q.correct) continue;
      if (removedOptions.includes(i)) {
        data[i] = 0;
        continue;
      }
      const portion = i === 3 || (i === 2 && removedOptions.length > 0)
        ? remaining
        : Math.random() * remaining;
      data[i] = Math.round(portion);
      remaining -= data[i];
    }
    const sum = data.reduce((a, b) => a + b, 0);
    if (sum !== 100) data[q.correct] += 100 - sum;
    setAudienceData(data);
    setShowAudience(true);
  };

  const usePhone = () => {
    if (usedPhone || answerState !== "idle") return;
    setUsedPhone(true);
    setShowPhone(true);
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const getOptionClass = (index: number) => {
    const base =
      "option-btn flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all duration-300 cursor-pointer w-full";

    if (removedOptions.includes(index)) {
      return `${base} border-gray-700 bg-gray-800/30 text-gray-600 cursor-not-allowed opacity-30`;
    }

    if (answerState === "revealed") {
      const q = QUESTIONS[currentQ];
      if (index === q.correct) return `${base} border-green-400 bg-green-500/20 text-green-300 shadow-[0_0_20px_rgba(74,222,128,0.3)]`;
      if (index === selectedAnswer) return `${base} border-red-400 bg-red-500/20 text-red-300 shadow-[0_0_20px_rgba(248,113,113,0.3)]`;
    }

    if (answerState === "selected" && index === selectedAnswer) {
      return `${base} border-orange-400 bg-orange-500/20 text-orange-300 animate-pulse`;
    }

    return `${base} border-indigo-500/40 bg-indigo-950/40 text-gray-200 hover:border-indigo-400 hover:bg-indigo-900/40`;
  };

  // ─── Welcome screen ───────────────────────────────────────────────────────

  if (screen === "welcome") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-4">
            <div className="text-6xl">&#x1F4B0;</div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Who Wants to Be
            </h1>
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              a Millionaire?
            </h1>
            <p className="text-indigo-300 text-sm mt-2">
              15 questions about computer science &amp; programming
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startGame()}
              placeholder="Your name (optional)"
              maxLength={30}
              className="w-full px-6 py-3 rounded-lg bg-indigo-950/60 border-2 border-indigo-500/40 text-white placeholder-indigo-400/60 focus:outline-none focus:border-indigo-400 text-center text-lg box-border"
            />
            <button
              onClick={startGame}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-indigo-500/25 border-2 border-transparent box-border"
            >
              Start Game
            </button>
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">Leaderboard</h2>
              <LeaderboardTable entries={leaderboard} />
            </div>
          )}
        </div>

        <MuteButton muted={muted} setMuted={setMuted} />
      </div>
    );
  }

  // ─── Result screen ─────────────────────────────────────────────────────────

  if (screen === "result") {
    const amountNum = parseAmount(finalAmount);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="space-y-3">
            <div className="text-5xl">
              {amountNum >= 1000000 ? "\uD83C\uDFC6" : amountNum > 0 ? "\uD83C\uDF89" : "\uD83D\uDE14"}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {getDisplayName()}, your result:
            </h1>
            <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              ${finalAmount === "0" ? "0" : finalAmount}
            </div>
            {amountNum >= 1000000 && (
              <p className="text-yellow-300 text-lg animate-pulse">
                You became a millionaire!
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => { resetGame(); setScreen("game"); }}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg"
            >
              Play Again
            </button>
            <button
              onClick={() => setScreen("welcome")}
              className="w-full px-6 py-3 rounded-lg border-2 border-indigo-500/40 text-indigo-300 font-bold hover:border-indigo-400 hover:bg-indigo-950/40 transition-all"
            >
              Main Menu
            </button>
          </div>

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-3">Leaderboard</h2>
              <LeaderboardTable entries={leaderboard} />
            </div>
          )}
        </div>

        <MuteButton muted={muted} setMuted={setMuted} />
      </div>
    );
  }

  // ─── Game screen ───────────────────────────────────────────────────────────

  const q = QUESTIONS[currentQ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left sidebar — desktop: player info + money tree + mini leaderboard */}
      <div className="hidden lg:flex flex-col w-60 shrink-0 bg-indigo-950/30 border-r border-indigo-500/20 overflow-y-auto">
        {/* Player name */}
        <div className="p-4 border-b border-indigo-500/20">
          <label className="text-xs text-indigo-400 uppercase tracking-wide">Player</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
            maxLength={30}
            className="w-full mt-1 px-2 py-1.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-white text-sm placeholder-indigo-400/40 focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* Money tree */}
        <div className="flex-1 p-3">
          <div className="space-y-0.5">
            {AMOUNTS.slice()
              .reverse()
              .map((amount, idx) => {
                const realIdx = AMOUNTS.length - 1 - idx;
                const isCurrent = realIdx === currentQ;
                const isPassed = realIdx < currentQ;
                const isSafe = SAFE_HAVENS.includes(realIdx);

                return (
                  <div
                    key={realIdx}
                    className={`flex justify-between items-center px-3 py-1 rounded text-sm font-mono transition-all ${
                      isCurrent
                        ? "bg-indigo-600/60 text-white font-bold scale-105"
                        : isPassed
                        ? "text-green-400/70"
                        : "text-indigo-400/50"
                    } ${isSafe ? "border-l-2 border-yellow-400" : ""}`}
                  >
                    <span className="text-xs opacity-60">{realIdx + 1}</span>
                    <span>${amount}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Mini leaderboard */}
        <div className="p-3 border-t border-indigo-500/20">
          <h3 className="text-xs text-indigo-400 uppercase tracking-wide mb-2">Top Players</h3>
          {leaderboard.length === 0 ? (
            <p className="text-indigo-400/40 text-xs">No results yet</p>
          ) : (
            <div className="space-y-1">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-indigo-300 truncate mr-2">
                    {i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : `${i + 1}.`}{" "}
                    {entry.name}
                  </span>
                  <span className="text-yellow-400 font-mono shrink-0">${entry.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        {/* Top bar: question number + amount (mobile) + lifelines */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-indigo-300 font-bold">
            <span className="text-white text-lg">{currentQ + 1}</span>
            <span className="text-indigo-400/60">/{QUESTIONS.length}</span>
            <span className="lg:hidden ml-3 text-yellow-400 text-sm font-mono">
              ${AMOUNTS[currentQ]}
            </span>
          </div>

          {/* Lifelines */}
          <div className="flex gap-2">
            <LifelineButton
              label="50:50"
              used={usedFiftyFifty}
              onClick={useFiftyFifty}
              disabled={answerState !== "idle"}
            />
            <LifelineButton
              label="&#x1F465;"
              title="Ask the Audience"
              used={usedAudience}
              onClick={useAudience}
              disabled={answerState !== "idle"}
            />
            <LifelineButton
              label="&#x1F4DE;"
              title="Phone a Friend"
              used={usedPhone}
              onClick={usePhone}
              disabled={answerState !== "idle"}
            />
          </div>
        </div>

        {/* Question image */}
        <div className="flex justify-center mb-4">
          <div className="w-full max-w-lg aspect-video rounded-xl overflow-hidden bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center">
            <img
              src={q.image}
              alt={`Question ${currentQ + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.innerHTML =
                  `<div class="text-indigo-400/40 text-6xl">?</div>`;
              }}
            />
          </div>
        </div>

        {/* Question text */}
        <div className="text-center mb-6">
          <div className="inline-block bg-indigo-950/60 border border-indigo-500/30 rounded-xl px-6 py-4 max-w-2xl">
            <p className="text-white text-lg md:text-xl font-medium leading-relaxed">
              {q.question}
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answerState !== "idle" || removedOptions.includes(i)}
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
        {showAudience && (
          <div className="bg-indigo-950/80 border border-indigo-500/30 rounded-xl p-4 mb-4">
            <p className="text-indigo-300 text-sm mb-3 text-center font-bold">
              Audience Poll Results:
            </p>
            <div className="flex items-end justify-center gap-4 h-32">
              {audienceData.map((pct, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-indigo-300">{Math.round(pct)}%</span>
                  <div
                    className="w-10 bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      opacity: removedOptions.includes(i) ? 0.2 : 1,
                    }}
                  />
                  <span className="text-xs text-indigo-400 font-bold">{LETTER_LABELS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phone a friend */}
        {showPhone && q.hint && (
          <div className="bg-indigo-950/80 border border-indigo-500/30 rounded-xl p-4 mb-4">
            <p className="text-indigo-300 text-sm mb-2 font-bold">
              &#x1F4DE; Phone a Friend:
            </p>
            <p className="text-white text-sm italic leading-relaxed">
              &ldquo;{q.hint}&rdquo;
            </p>
          </div>
        )}
      </div>

      <MuteButton muted={muted} setMuted={setMuted} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MuteButton({ muted, setMuted }: { muted: boolean; setMuted: (v: boolean) => void }) {
  return (
    <button
      onClick={() => {
        // Ensure AudioContext is created on user interaction
        getAudioCtx();
        setMuted(!muted);
      }}
      className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 hover:text-white hover:border-indigo-400 transition-all flex items-center justify-center text-lg z-50"
      title={muted ? "Unmute" : "Mute"}
    >
      {muted ? "\u{1F507}" : "\u{1F509}"}
    </button>
  );
}

function LifelineButton({
  label,
  title,
  used,
  onClick,
  disabled,
}: {
  label: string;
  title?: string;
  used: boolean;
  onClick: () => void;
  disabled: boolean;
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

function LeaderboardTable({ entries, compact }: { entries: LeaderboardEntry[]; compact?: boolean }) {
  if (entries.length === 0) {
    return (
      <p className="text-indigo-400/40 text-center py-4 text-sm">
        No results yet. Be the first!
      </p>
    );
  }

  return (
    <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-indigo-500/20">
            <th className="px-3 py-2 text-indigo-400 text-left">#</th>
            <th className="px-3 py-2 text-indigo-400 text-left">Name</th>
            <th className="px-3 py-2 text-indigo-400 text-right">Prize</th>
            {!compact && <th className="px-3 py-2 text-indigo-400 text-right">Date</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={i}
              className="border-b border-indigo-500/10 hover:bg-indigo-900/20"
            >
              <td className="px-3 py-1.5 text-indigo-300 font-bold text-xs">
                {i === 0 ? "\uD83E\uDD47" : i === 1 ? "\uD83E\uDD48" : i === 2 ? "\uD83E\uDD49" : i + 1}
              </td>
              <td className="px-3 py-1.5 text-white text-xs truncate max-w-[120px]">{entry.name}</td>
              <td className="px-3 py-1.5 text-yellow-400 text-right font-mono text-xs">
                ${entry.amount}
              </td>
              {!compact && (
                <td className="px-3 py-1.5 text-indigo-400/60 text-right text-xs">
                  {entry.date}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
