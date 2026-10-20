import { describe, expect, it } from 'vitest';
import { ITEMS, isPaired } from '../../src/instrument/items';
import { scoreDim, scaleItems } from '../../src/scoring/scale';
import { setScale } from './helpers';

describe('scoreDim', () => {
  it('keys answers toward the + pole and scales the mean by 50', () => {
    const A = setScale({}, 'econ', 4, 2); // agree with right, disagree with left → k = +1 everywhere
    const r = scoreDim('econ', A);
    expect(r.ok && r.score).toBe(50);
    expect(r.ok && r.consistency).toBe(1);
  });

  it('scores a fully balanced acquiescent respondent at 0', () => {
    const r = scoreDim('social', setScale({}, 'social', 5, 5));
    expect(r.ok && r.score).toBe(0);
    expect(r.ok && r.consistency).toBe(0);
    expect(r.ok && r.contra).toBe(6);
    expect(r.ok && r.both).toBe(6);
  });

  it('computes the band from the item SD with a 0.5 floor and clips it to ±100', () => {
    const r = scoreDim('econ', setScale({}, 'econ', 5, 1)); // k = +2 on all 12, sd = 0 → floor 0.5
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const half = ((1.96 * 0.5) / Math.sqrt(12)) * 50;
    expect(r.score).toBe(100);
    expect(r.half).toBeCloseTo(half, 10);
    expect(r.hi).toBe(100);
    expect(r.lo).toBeCloseTo(100 - half, 10);

    const neg = scoreDim('econ', setScale({}, 'econ', 1, 5));
    expect(neg.ok && neg.lo).toBe(-100);
  });

  it('uses the sample SD when it exceeds the floor', () => {
    const A: Record<string, number> = {};
    const its = scaleItems('auth');
    its.forEach((i, n) => (A[i.id] = n % 2 === 0 ? 5 : 3)); // a-items 5 (k=+2), b-items 3 (k=0)
    const r = scoreDim('auth', A);
    if (!r.ok) throw new Error('expected a score');
    const k = its.map((i) => (A[i.id] - 3) * i.dir);
    const m = k.reduce((x, y) => x + y) / k.length;
    const s = Math.sqrt(k.reduce((x, y) => x + (y - m) ** 2, 0) / (k.length - 1));
    expect(r.score).toBeCloseTo(m * 50, 10);
    expect(r.half).toBeCloseTo(((1.96 * s) / Math.sqrt(12)) * 50, 10);
    expect(r.consistency).toBe(1);
  });

  it('needs at least 60% of a scale answered (8 of 12, 3 of 4)', () => {
    const econ = ITEMS.filter(isPaired).filter((i) => i.dim === 'econ');
    const A: Record<string, number> = {};
    econ.forEach((i, n) => (A[i.id] = n < 8 ? 4 : 0));
    expect(scoreDim('econ', A).ok).toBe(true);
    A[econ[7].id] = 0;
    const r = scoreDim('econ', A);
    expect(r).toEqual({ ok: false, n: 7, total: 12 });

    const cl = scaleItems('climate');
    const B: Record<string, number> = { [cl[0].id]: 4, [cl[1].id]: 2, [cl[2].id]: 4 };
    expect(scoreDim('climate', B).ok).toBe(true);
    delete B[cl[2].id];
    expect(scoreDim('climate', B).ok).toBe(false);
  });

  it('treats No opinion (0) and unanswered items as missing', () => {
    const A = setScale({}, 'global', 4, 2);
    A.G1a = 0;
    const r = scoreDim('global', A);
    expect(r.ok && r.n).toBe(3);
    expect(r.ok && r.both).toBe(1);
  });

  it('counts disagree–disagree pairs as contradictions but not neutral ones', () => {
    const A = setScale({}, 'populism', 3, 3);
    A.Q1a = 1;
    A.Q1b = 2;
    const r = scoreDim('populism', A);
    expect(r.ok && r.contra).toBe(1);
    expect(r.ok && r.both).toBe(2);
  });
});
