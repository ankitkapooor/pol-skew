import { describe, expect, it } from 'vitest';
import { axisWord, mfReading, selfRead, selfValue, strength, verdict } from '../../src/scoring/labels';
import { scoreMF } from '../../src/scoring/mf';
import { computeResults } from '../../src/scoring/results';
import type { ScaleResult } from '../../src/scoring/scale';
import { PASS_CHECKS, setScale, timing, type Mutable } from './helpers';
import { ITEMS } from '../../src/instrument/items';

const S = (score: number): ScaleResult => ({
  ok: true,
  n: 12,
  total: 12,
  score,
  lo: score - 10,
  hi: score + 10,
  half: 10,
  consistency: 1,
  contra: 0,
  both: 6,
});

describe('strength and axisWord (provisional cutoffs)', () => {
  it('uses 15 / 40 / 70 on |score|', () => {
    expect(strength(14.9)).toBe('centrist');
    expect(strength(-15)).toBe('leaning');
    expect(strength(39.9)).toBe('leaning');
    expect(strength(40)).toBe('moderately');
    expect(strength(-69.9)).toBe('moderately');
    expect(strength(70)).toBe('strongly');
  });
  it('names the side and strength', () => {
    expect(axisWord('econ', -20)).toBe('leaning left');
    expect(axisWord('social', 55)).toBe('moderately traditional');
    expect(axisWord('auth', -80)).toBe('strongly civil-libertarian');
    expect(axisWord('auth', 5)).toBe('centrist');
    expect(axisWord('climate', 5)).toBe('near the middle');
    expect(axisWord('populism', 30)).toBe('leaning populist');
  });
});

describe('verdict', () => {
  it('covers centrist, one-axis-centrist and the four quadrants', () => {
    expect(verdict(10, -10).title).toBe('Centrist');
    expect(verdict(5, -30).title).toBe('Economically centrist, socially progressive');
    expect(verdict(5, 30).title).toBe('Economically centrist, socially traditional');
    expect(verdict(-30, 5).title).toBe('Economically left, socially centrist');
    expect(verdict(30, 5).title).toBe('Economically right, socially centrist');
    expect(verdict(-30, -30).title).toBe('Left-progressive');
    expect(verdict(30, 30).title).toBe('Conservative');
    expect(verdict(30, -30).title).toBe('Libertarian-leaning');
    expect(verdict(-30, 30).title).toBe('Communitarian');
  });
});

describe('selfRead', () => {
  it('maps the 7-point label to −100…+100', () => {
    expect(selfValue(1)).toBe(-100);
    expect(selfValue(4)).toBe(0);
    expect(selfValue(7)).toBe(100);
  });
  it('returns null without a self-placement or scores', () => {
    expect(selfRead({}, S(0), S(0))).toBeNull();
    expect(selfRead({ SP: 4 }, { ok: false, n: 1, total: 12 }, S(0))).toBeNull();
  });
  it('flags a mixed profile when the scales point opposite ways by ≥25', () => {
    const r = selfRead({ SP: 4 }, S(60), S(-40));
    expect(r?.kind).toBe('mixed');
    expect(r?.text).toContain('economic score (+60) and social score (-40)');
  });
  it('reports a match within 25 of either scale, naming the closer one', () => {
    const r = selfRead({ SP: 2 }, S(-60), S(-20)); // label −66.7
    expect(r?.kind).toBe('match');
    expect(r?.text).toBe(
      'You described yourself as left / liberal, which matches your economic positions closely.',
    );
    expect(selfRead({ SP: 2 }, S(-60), S(-50))?.text).toContain('and your other positions too');
    expect(selfRead({ SP: 2 }, S(-60), S(-20))?.html).toContain('<b>left / liberal</b>');
  });
  it('reports a symbolic–operational gap otherwise', () => {
    const r = selfRead({ SP: 7 }, S(20), S(30)); // label +100, composite +25 → 75 further left
    expect(r?.kind).toBe('gap');
    expect(r?.text).toContain('about 75 points further left / progressive');
  });
});

describe('mfReading', () => {
  it('describes the balance between individualising and binding foundations', () => {
    const A: Mutable = {};
    ITEMS.forEach((i) => {
      if (i.dim === 'mf') A[i.id] = i.f === 'care' || i.f === 'equality' ? 5 : 2;
    });
    expect(mfReading(scoreMF(A))?.text).toContain('Care and equality outweigh loyalty');
    ITEMS.forEach((i) => {
      if (i.dim === 'mf') A[i.id] = 3;
    });
    expect(mfReading(scoreMF(A))?.text).toContain('roughly balanced');
    expect(mfReading(scoreMF({}))).toBeNull();
  });
});

describe('sanity case 2 (docs/HANDOFF.md §1.5)', () => {
  it('econ fully right, social progressive, others mild, 6 s each → +100, −75, Libertarian-leaning, High', () => {
    const A: Mutable = { ...PASS_CHECKS, SP: 4 };
    setScale(A, 'econ', 5, 1);
    setScale(A, 'social', 1, 4);
    setScale(A, 'auth', 4, 2);
    setScale(A, 'climate', 2, 4);
    setScale(A, 'global', 3, 3);
    setScale(A, 'populism', 4, 3);
    ITEMS.forEach((i, n) => {
      if (i.dim === 'mf') A[i.id] = [4, 3, 5, 2, 4, 3][n % 6];
    });
    const { T, W } = timing(A, 6);
    const R = computeResults(A, T, W);
    expect(R.sc.econ.ok && R.sc.econ.score).toBe(100);
    expect(R.sc.social.ok && R.sc.social.score).toBe(-75);
    expect(R.verdict.title).toBe('Libertarian-leaning');
    expect(R.q.grade.t).toBe('High');
    expect(R.self?.kind).toBe('mixed');
    expect(R.contraPairs.size).toBe(0);
  });
});
