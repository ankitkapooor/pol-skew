import { ALL_SCALES, ITEMS, isPaired, type ScaleDim } from '../instrument/items';
import { NOT_PLACED, mfReading, selfRead, verdict, type SelfRead, type Verdict } from './labels';
import { scoreMF, type MFResult } from './mf';
import { quality, type QualityResult } from './quality';
import { isContradiction, scoreDim, type ScaleResult } from './scale';
import type { Answers, Times, Words } from './types';

export interface Results {
  sc: Record<ScaleDim, ScaleResult>;
  mf: MFResult;
  q: QualityResult;
  verdict: Verdict;
  placed: boolean;
  self: SelfRead | null;
  mfRead: { html: string; text: string } | null;
  /** Pair ids answered on the same side twice. */
  contraPairs: Set<string>;
}

/** Everything the results page, exports and submissions need, from a finished run. Pure. */
export function computeResults(A: Answers, T: Times, W: Words): Results {
  const sc = {} as Record<ScaleDim, ScaleResult>;
  for (const d of ALL_SCALES) sc[d] = scoreDim(d, A);
  const e = sc.econ;
  const so = sc.social;
  const placed = e.ok && so.ok;
  const contraPairs = new Set<string>();
  for (const i of ITEMS.filter(isPaired)) {
    if (i.dir === 1 && isContradiction(A[i.pair + 'a'], A[i.pair + 'b'])) contraPairs.add(i.pair);
  }
  const mf = scoreMF(A);
  return {
    sc,
    mf,
    q: quality(A, T, W),
    verdict: e.ok && so.ok ? verdict(e.score, so.score) : NOT_PLACED,
    placed,
    self: selfRead(A, e, so),
    mfRead: mfReading(mf),
    contraPairs,
  };
}
