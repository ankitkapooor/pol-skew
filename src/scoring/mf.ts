import { FOUNDATIONS, ITEMS, isMF, type Foundation } from '../instrument/items';
import { MF_MIN_ITEMS } from './constants';
import { mean, valid } from './stats';
import type { Answers } from './types';

export interface FoundationScore {
  /** Mean 1–5 answer on the foundation's items. */
  raw: number;
  /** raw − personal mean (ipsatized). */
  rel: number;
}
export interface MFResult {
  personal: number | null;
  f: Record<Foundation, FoundationScore | null>;
  /** Mean raw of care and equality (individualising). */
  ind: number | null;
  /** Mean raw of loyalty, authority and purity (binding). */
  bin: number | null;
  diff: number | null;
}

export function scoreMF(A: Answers): MFResult {
  const mfItems = ITEMS.filter(isMF);
  const all = mfItems.map((i) => A[i.id]).filter(valid);
  const personal = all.length ? mean(all) : null;
  const f = {} as Record<Foundation, FoundationScore | null>;
  for (const name of FOUNDATIONS) {
    const v = mfItems
      .filter((i) => i.f === name)
      .map((i) => A[i.id])
      .filter(valid);
    f[name] =
      v.length >= MF_MIN_ITEMS && personal !== null ? { raw: mean(v), rel: mean(v) - personal } : null;
  }
  const g = (ks: Foundation[]): number | null => {
    const v = ks.map((k) => f[k]).filter((x): x is FoundationScore => x !== null);
    return v.length ? mean(v.map((x) => x.raw)) : null;
  };
  const ind = g(['care', 'equality']);
  const bin = g(['loyalty', 'authority', 'purity']);
  return { personal, f, ind, bin, diff: ind !== null && bin !== null ? ind - bin : null };
}

/** Foundations with a score, highest relative weight first. */
export const rankFoundations = (mf: MFResult): Foundation[] =>
  FOUNDATIONS.filter((x) => mf.f[x]).sort((a, b) => mf.f[b]!.rel - mf.f[a]!.rel);
