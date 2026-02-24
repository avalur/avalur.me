import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  get,
  set,
  onValue,
  type Unsubscribe,
} from "firebase/database";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  name: string;
  amount: string;
  questionIndex: number;
  date: string;
}

// ─── Firebase config ─────────────────────────────────────────────────────────
// TODO: Replace with your Firebase project config from
// https://console.firebase.google.com → Project Settings → Your apps → Config

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAP5SweE0HQFx9uvu0bTqIu4RpG_jghHBk",
  authDomain: "avalur-me.firebaseapp.com",
  databaseURL: "https://avalur-me-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "avalur-me",
  storageBucket: "avalur-me.firebasestorage.app",
  messagingSenderId: "160631892432",
  appId: "1:160631892432:web:099b1e752315d129a671d5",
  measurementId: "G-4WWNZ69QDE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function getRef(path: string) {
  return ref(db, path);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseAmount(amount: string): number {
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

function sortAndCap(board: LeaderboardEntry[]): LeaderboardEntry[] {
  return board
    .sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount))
    .slice(0, 20);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function loadLeaderboard(path = "leaderboard"): Promise<LeaderboardEntry[]> {
  try {
    const snapshot = await get(getRef(path));
    if (!snapshot.exists()) return [];
    const data = snapshot.val() as LeaderboardEntry[];
    return sortAndCap(deduplicateBoard(data));
  } catch {
    return [];
  }
}

export async function saveToLeaderboard(entry: LeaderboardEntry, path = "leaderboard"): Promise<void> {
  try {
    const dbRef = getRef(path);
    const snapshot = await get(dbRef);
    const board: LeaderboardEntry[] = snapshot.exists()
      ? (snapshot.val() as LeaderboardEntry[])
      : [];
    board.push(entry);
    const deduped = sortAndCap(deduplicateBoard(board));
    await set(dbRef, deduped);
  } catch (e) {
    console.error("Failed to save to leaderboard:", e);
  }
}

export function subscribeToLeaderboard(
  callback: (entries: LeaderboardEntry[]) => void,
  path = "leaderboard"
): Unsubscribe {
  return onValue(
    getRef(path),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const data = snapshot.val() as LeaderboardEntry[];
      callback(sortAndCap(deduplicateBoard(data)));
    },
    () => {
      callback([]);
    }
  );
}
