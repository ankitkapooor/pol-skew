import { ALL_SCALES, ITEMS, isPaired } from '../instrument/items';
import { ATTENTION_ANSWER, INFREQ_MAX_PASS, QUALITY, SPEED_BASE_S, SPEED_PER_WORD_S } from './constants';
import { scoreDim } from './scale';
import { mean, sd, valid } from './stats';
import type { Answers, Times, Words } from './types';

export type CheckState = 'good' | 'warn' | 'bad';
export type CheckKey = 'attn' | 'infreq' | 'contra' | 'acq' | 'spread' | 'speed' | 'miss';
export const CHECK_ORDER: readonly CheckKey[] = [
  'attn',
  'infreq',
  'contra',
  'acq',
  'spread',
  'speed',
  'miss',
];

export interface Check {
  label: string;
  value: string;
  state: CheckState;
  note: string;
  /** The numeric quantity behind the check (share, mean, sd or count; 1/0 for pass/fail). */
  metric: number;
}
export interface Grade {
  t: 'High' | 'Moderate' | 'Low';
  s: CheckState;
}
export interface QualityResult {
  r: Record<CheckKey, Check>;
  grade: Grade;
}

/** Share of timed answers given faster than reading the statement at 400 wpm plus half a second. */
export function tooFastShare(T: Times, W: Words): number {
  const ids = Object.keys(T).filter((id) => id !== 'SP' && T[id] > 0 && W[id]);
  if (!ids.length) return 0;
  return ids.filter((id) => T[id] / 1000 < SPEED_BASE_S + W[id] * SPEED_PER_WORD_S).length / ids.length;
}

/** Above `bad` → bad, above `warn` → warn (or below, when `low` is set). */
const level = (x: number, t: { warn: number; bad: number }, low = false): CheckState =>
  low ? (x < t.bad ? 'bad' : x < t.warn ? 'warn' : 'good') : x > t.bad ? 'bad' : x > t.warn ? 'warn' : 'good';

/** Total contradictory pairs and answered pairs across the scales that have a score. */
export function contradictionTotals(A: Answers): { contra: number; both: number } {
  let contra = 0;
  let both = 0;
  for (const d of ALL_SCALES) {
    const s = scoreDim(d, A);
    if (s.ok) {
      contra += s.contra;
      both += s.both;
    }
  }
  return { contra, both };
}

export function quality(A: Answers, T: Times, W: Words): QualityResult {
  const attnOK = A.AC === ATTENTION_ANSWER;
  const infreqOK = valid(A.IF) && A.IF <= INFREQ_MAX_PASS;
  const { contra, both } = contradictionTotals(A);
  const cr = both ? contra / both : 0;
  const balanced = ITEMS.filter(isPaired)
    .filter((i) => valid(A[i.id]))
    .map((i) => A[i.id] - 3);
  const acq = balanced.length ? mean(balanced) : 0;
  const spread = sd(ITEMS.map((i) => A[i.id]).filter(valid));
  const fast = tooFastShare(T, W);
  const missing = ITEMS.filter((i) => A[i.id] === 0).length;

  const r: Record<CheckKey, Check> = {
    attn: {
      label: 'Attention check',
      value: attnOK ? 'Passed' : 'Missed',
      state: attnOK ? 'good' : 'bad',
      note: 'One statement asked for a specific answer.',
      metric: attnOK ? 1 : 0,
    },
    infreq: {
      label: 'Implausible-statement check',
      value: infreqOK ? 'Passed' : 'Missed',
      state: infreqOK ? 'good' : 'bad',
      note: 'One statement (never having used a phone or computer) can’t be true for anyone taking this online.',
      metric: infreqOK ? 1 : 0,
    },
    contra: {
      label: 'Contradictory pairs',
      value: `${contra} of ${both}`,
      state: level(cr, QUALITY.contra),
      note: 'Each pair puts the same topic both ways. Agreeing with both sides, or disagreeing with both, is a sign of careless or acquiescent answering. Contradicted pairs are highlighted in the item table.',
      metric: cr,
    },
    acq: {
      label: 'Agreement tendency',
      value: (acq >= 0 ? '+' : '') + acq.toFixed(2),
      state: level(Math.abs(acq), QUALITY.acq),
      note: 'Average raw agreement across the 48 paired statements before scoring (−2 to +2). Near 0 is ideal. Because every pair is balanced, this tendency mostly cancels out of your scores.',
      metric: acq,
    },
    spread: {
      label: 'Response variety',
      value: spread.toFixed(2),
      state: level(spread, QUALITY.spread, true),
      note: 'Spread of your answers on the 1–5 scale. Very low spread suggests the same option was picked repeatedly.',
      metric: spread,
    },
    speed: {
      label: 'Answers faster than reading speed',
      value: Math.round(fast * 100) + '%',
      state: level(fast, QUALITY.speed),
      note: 'Share of answers given faster than reading the statement at 400 words a minute plus half a second. Only your first answer to each statement is timed.',
      metric: fast,
    },
    miss: {
      label: '“No opinion” answers',
      value: `${missing} of ${ITEMS.length}`,
      state: level(missing, QUALITY.miss),
      note: 'Left out of scoring instead of counted as neutral, so they widen the bands on the affected scales.',
      metric: missing,
    },
  };
  const bad = CHECK_ORDER.filter((k) => r[k].state === 'bad').length;
  const warn = CHECK_ORDER.filter((k) => r[k].state === 'warn').length;
  const grade: Grade =
    bad === 0 && warn <= 1
      ? { t: 'High', s: 'good' }
      : bad <= 1
        ? { t: 'Moderate', s: 'warn' }
        : { t: 'Low', s: 'bad' };
  return { r, grade };
}
