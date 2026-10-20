/* localStorage wrapper. Every access is wrapped in try/catch: storage can be missing or throw in
   private windows, previews, or with site data blocked, and the app must still work without it. */

export interface RunState {
  order: string[];
  idx: number;
  answers: Record<string, number>;
  times: Record<string, number>;
  words: Record<string, number>;
  done: boolean;
  /** Instrument version the run was started under. Absent on runs saved by the prototype. */
  version?: string;
  /** ISO date (YYYY-MM-DD) the run was completed, for exports. */
  completedOn?: string;
  /** Optional U.S. benchmark module, run after the results. */
  benchmark?: BenchmarkState;
}

export interface BenchmarkState {
  idx: number;
  /** For two-step (branch) items: the answer to the first question while the follow-up is shown. */
  first?: number;
  /** Item id → source code (summary code for branch items); -1 = skipped. */
  answers: Record<string, number>;
  done: boolean;
}

export const STORE_KEY = 'ideology-inventory-v2';

export function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep going in memory */
  }
}
export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadRun(): RunState | null {
  const s = readJSON<RunState>(STORE_KEY);
  return s && Array.isArray(s.order) ? s : null;
}
export const saveRun = (s: RunState): void => writeJSON(STORE_KEY, s);
