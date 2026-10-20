import { ITEMS, isPaired, type PairedItem, type ScaleDim } from '../instrument/items';
import { BAND_MIN_SD, BAND_Z, MIN_ANSWERED_SHARE, SCORE_MULTIPLIER } from './constants';
import { mean, sd, valid } from './stats';
import type { Answers } from './types';

export interface ScaleMissing {
  ok: false;
  n: number;
  total: number;
}
export interface ScaleScore {
  ok: true;
  n: number;
  total: number;
  /** −100…+100; +50 ≈ "somewhat agree" with the + pole on average. */
  score: number;
  /** Item-spread band, clipped to ±100. Not a retest interval. */
  lo: number;
  hi: number;
  half: number;
  /** |mean(k)| / mean(|k|): 1 = every answer points the same way. */
  consistency: number;
  /** Pairs where both halves were agreed with (≥4) or both disagreed with (≤2). */
  contra: number;
  /** Pairs where both halves were answered. */
  both: number;
}
export type ScaleResult = ScaleMissing | ScaleScore;

export const scaleItems = (dim: ScaleDim): PairedItem[] =>
  ITEMS.filter(isPaired).filter((i) => i.dim === dim);

/** True when a pair was answered on the same side twice (agree–agree or disagree–disagree). */
export const isContradiction = (a: number | undefined, b: number | undefined): boolean =>
  valid(a) && valid(b) && ((a >= 4 && b >= 4) || (a <= 2 && b <= 2));

export function scoreDim(dim: ScaleDim, A: Answers): ScaleResult {
  const its = scaleItems(dim);
  const k: number[] = [];
  for (const i of its) {
    const v = A[i.id];
    if (valid(v)) k.push((v - 3) * i.dir);
  }
  const n = k.length;
  const need = Math.ceil(its.length * MIN_ANSWERED_SHARE);
  if (n < need) return { n, total: its.length, ok: false };
  const m = mean(k);
  const s = Math.max(sd(k), BAND_MIN_SD);
  const half = ((BAND_Z * s) / Math.sqrt(n)) * SCORE_MULTIPLIER;
  const absMean = mean(k.map(Math.abs));
  const pairs = [...new Set(its.map((i) => i.pair))];
  let contra = 0;
  let both = 0;
  for (const p of pairs) {
    const a = A[p + 'a'];
    const b = A[p + 'b'];
    if (valid(a) && valid(b)) {
      both++;
      if (isContradiction(a, b)) contra++;
    }
  }
  const score = m * SCORE_MULTIPLIER;
  return {
    n,
    total: its.length,
    ok: true,
    score,
    lo: Math.max(-100, score - half),
    hi: Math.min(100, score + half),
    half,
    consistency: absMean === 0 ? 0 : Math.abs(m) / absMean,
    contra,
    both,
  };
}
