import { readJSON, removeKey, writeJSON } from '../state/storage';

/* Test–retest linkage. A random token lives only in this browser and is sent with both
   submissions; it identifies nobody and is deleted after the second submission. */
export const RETEST_KEY = 'ideology-inventory-retest';
export const SHARED_KEY = 'ideology-inventory-shared';

export interface RetestState {
  token: string;
  /** Local date (YYYY-MM-DD) of the first submission, used only for the reminder. */
  firstOn: string;
  /** Run fingerprint of the first submission, so the same run can't count as its own retest. */
  firstRun: string;
}

export const newToken = (): string =>
  [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

export const getRetest = (): RetestState | null => readJSON<RetestState>(RETEST_KEY);
export const setRetest = (r: RetestState): void => writeJSON(RETEST_KEY, r);
export const clearRetest = (): void => removeKey(RETEST_KEY);

/** Identifies a run without content: its item order is random per run. */
export const runFingerprint = (order: readonly string[]): string => order.slice(0, 12).join('.');

/** Whole days since an ISO date (local). */
export function daysSince(iso: string, now = new Date()): number {
  const [y, m, d] = iso.split('-').map(Number);
  const then = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86400000);
}

/** Submissions made from this browser, keyed by run fingerprint (id only; the deletion code is never stored). */
export type SharedLog = Record<string, { id: string }>;
export const getShared = (): SharedLog => readJSON<SharedLog>(SHARED_KEY) ?? {};
export const addShared = (run: string, id: string): void =>
  writeJSON(SHARED_KEY, { ...getShared(), [run]: { id } });
export function removeShared(id: string): void {
  const s = getShared();
  for (const k of Object.keys(s)) if (s[k].id === id) delete s[k];
  writeJSON(SHARED_KEY, s);
}
