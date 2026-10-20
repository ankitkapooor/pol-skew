import { ITEMS, isMF, isPaired, wordCount, byId, type ScaleDim } from '../../src/instrument/items';

export type Mutable = Record<string, number>;

/** Every bank item answered `v`, plus AC/IF/SP if given. */
export function allAnswers(v: number, extra: Mutable = {}): Mutable {
  const A: Mutable = {};
  for (const i of ITEMS) A[i.id] = v;
  return { ...A, ...extra };
}

/** Answers that pass both checks: AC = 2, IF = 1. */
export const PASS_CHECKS = { AC: 2, IF: 1 } as const;

/** Set every pair of a scale: a-side answer and b-side answer. */
export function setScale(A: Mutable, dim: ScaleDim, a: number, b: number): Mutable {
  for (const i of ITEMS.filter(isPaired).filter((x) => x.dim === dim)) A[i.id] = i.dir === 1 ? a : b;
  return A;
}

export function setMF(A: Mutable, v: number): Mutable {
  for (const i of ITEMS.filter(isMF)) A[i.id] = v;
  return A;
}

/** Uniform response times (seconds) and real word counts for every answered id. */
export function timing(A: Mutable, seconds: number): { T: Mutable; W: Mutable } {
  const T: Mutable = {};
  const W: Mutable = {};
  for (const id of Object.keys(A)) {
    T[id] = seconds * 1000;
    W[id] = wordCount(byId(id).text);
  }
  return { T, W };
}
