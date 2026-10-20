import { DIMS, MF_NAMES, SELF_OPTS, type ScaleDim } from '../instrument/items';
import { CUTOFFS, MF_BALANCED_DIFF, SELF_MATCH_DISTANCE, SELF_MIXED_THRESHOLD } from './constants';
import { rankFoundations, type MFResult } from './mf';
import type { ScaleResult } from './scale';
import type { Answers } from './types';

export type Strength = 'centrist' | 'leaning' | 'moderately' | 'strongly';

// Provisional cutoffs, expressed in answer terms: ±15 ≈ within a third of a step of neutral on average; ±50 ≈ "somewhat agree" with one side on average.
export function strength(s: number): Strength {
  const a = Math.abs(s);
  return a < CUTOFFS.centrist
    ? 'centrist'
    : a < CUTOFFS.leaning
      ? 'leaning'
      : a < CUTOFFS.moderately
        ? 'moderately'
        : 'strongly';
}

export function axisWord(dim: ScaleDim, s: number): string {
  if (Math.abs(s) < CUTOFFS.centrist)
    return dim === 'econ' || dim === 'social' || dim === 'auth' ? 'centrist' : 'near the middle';
  const side = s < 0 ? DIMS[dim].negW : DIMS[dim].posW;
  const st = strength(s);
  return (st === 'leaning' ? 'leaning ' : st + ' ') + side;
}

export interface Verdict {
  title: string;
  body: string;
}

export function verdict(e: number, so: number): Verdict {
  const ec = Math.abs(e) < CUTOFFS.centrist;
  const sc = Math.abs(so) < CUTOFFS.centrist;
  if (ec && sc)
    return {
      title: 'Centrist',
      body: 'Your economic and social answers both sit close to the middle of the scale. You may hold genuinely moderate views, or mix positions from different sides topic by topic.',
    };
  if (ec)
    return {
      title: 'Economically centrist, socially ' + (so < 0 ? 'progressive' : 'traditional'),
      body: 'Your clearest signal is on social and cultural questions; on economics you sit near the middle.',
    };
  if (sc)
    return {
      title: 'Economically ' + (e < 0 ? 'left' : 'right') + ', socially centrist',
      body: 'Your clearest signal is on economic questions; on social and cultural issues you sit near the middle.',
    };
  if (e < 0 && so < 0)
    return {
      title: 'Left-progressive',
      body: 'You favour a larger economic role for government together with socially progressive positions.',
    };
  if (e > 0 && so > 0)
    return {
      title: 'Conservative',
      body: 'You favour markets and a smaller economic state together with more traditional social positions.',
    };
  if (e > 0 && so < 0)
    return {
      title: 'Libertarian-leaning',
      body: 'You combine market-oriented economics with socially progressive views, a profile that a single left–right scale captures poorly.',
    };
  return {
    title: 'Communitarian',
    body: 'You combine support for an active economic state with more traditional social views. This profile is common in many countries, including India, but disappears on one-axis measures.',
  };
}

export const NOT_PLACED: Verdict = {
  title: 'Not enough answers to place you',
  body: 'Too many statements were marked No opinion on the economic or social scale. Retake and answer at least 8 of 12 on each.',
};

export type SelfReadKind = 'mixed' | 'match' | 'gap';
export interface SelfRead {
  kind: SelfReadKind;
  /** HTML with the self-label in <b>; all interpolated values are numbers or fixed option labels. */
  html: string;
  /** The same sentence as plain text. */
  text: string;
}

/** Self-label mapped to −100…+100: (SP − 4) / 3 × 100. */
export const selfValue = (sp: number): number => ((sp - 4) / 3) * 100;

const signed = (v: number): string => `${v > 0 ? '+' : ''}${v}`;

export function selfRead(A: Answers, e: ScaleResult, so: ScaleResult): SelfRead | null {
  if (!A.SP || !e.ok || !so.ok) return null;
  const lab = SELF_OPTS[A.SP - 1].toLowerCase();
  const sv = selfValue(A.SP);
  const E = Math.round(e.score);
  const So = Math.round(so.score);
  const build = (kind: SelfReadKind, f: (b: (x: string) => string) => string): SelfRead => ({
    kind,
    html: f((x) => `<b>${x}</b>`),
    text: f((x) => x),
  });
  if (
    Math.sign(e.score) !== Math.sign(so.score) &&
    Math.abs(e.score) >= SELF_MIXED_THRESHOLD &&
    Math.abs(so.score) >= SELF_MIXED_THRESHOLD
  )
    return build(
      'mixed',
      (b) =>
        `You described yourself as ${b(lab)}. Your economic score (${signed(E)}) and social score (${signed(So)}) point in opposite directions, so no single left–right label can fit both. This mixed pattern is the main reason researchers measure the two separately.`,
    );
  const de = Math.abs(sv - e.score);
  const ds = Math.abs(sv - so.score);
  if (Math.min(de, ds) < SELF_MATCH_DISTANCE) {
    const which = de < ds ? 'economic' : 'social';
    const also = Math.max(de, ds) < SELF_MATCH_DISTANCE ? ' and your other positions too' : '';
    return build(
      'match',
      (b) => `You described yourself as ${b(lab)}, which matches your ${which} positions closely${also}.`,
    );
  }
  const comp = (e.score + so.score) / 2;
  const gap = comp - sv;
  return build(
    'gap',
    (b) =>
      `You described yourself as ${b(lab)}, but your issue positions sit about ${Math.round(Math.abs(gap))} points further ${gap < 0 ? 'left / progressive' : 'right / traditional'}. Political scientists call this a gap between symbolic ideology (the label) and operational ideology (the positions). It is common.`,
  );
}

/** Plain-language reading of the moral-foundation profile, or null when it can't be computed. */
export function mfReading(mf: MFResult): { html: string; text: string } | null {
  if (mf.diff === null) return null;
  const ranked = rankFoundations(mf);
  const nm = (i: number) => MF_NAMES[ranked[i]].toLowerCase();
  const tail =
    Math.abs(mf.diff) < MF_BALANCED_DIFF
      ? 'Your individual-focused foundations (care, equality) and group-focused ones (loyalty, authority, purity) are roughly balanced.'
      : mf.diff > 0
        ? 'Care and equality outweigh loyalty, authority and purity for you. In U.S. and Western European samples this pattern is more common on the left; the link is weaker or different in many other cultures.'
        : 'Loyalty, authority and purity outweigh care and equality for you. In U.S. and Western European samples this pattern is more common on the right; the link is weaker or different in many other cultures.';
  const f = (b: (x: string) => string) =>
    `Relative to your own average, you weight ${b(nm(0))} and ${b(nm(1))} most and ${b(nm(ranked.length - 1))} least. ` +
    tail;
  return { html: f((x) => `<b>${x}</b>`), text: f((x) => x) };
}
