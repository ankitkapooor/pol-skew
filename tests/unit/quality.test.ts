import { describe, expect, it } from 'vitest';
import { ALL_SCALES, ITEMS, isPaired } from '../../src/instrument/items';
import { quality, tooFastShare } from '../../src/scoring/quality';
import { PASS_CHECKS, setScale, timing, type Mutable } from './helpers';

/** A clean, high-quality run: every pair answered consistently, varied MF answers, 6 s per item. */
function clean(): Mutable {
  const A: Mutable = { ...PASS_CHECKS, SP: 4 };
  setScale(A, 'econ', 5, 1);
  setScale(A, 'social', 1, 4);
  setScale(A, 'auth', 4, 2);
  setScale(A, 'climate', 2, 4);
  setScale(A, 'global', 4, 2);
  setScale(A, 'populism', 2, 5);
  ITEMS.forEach((i, n) => {
    if (i.dim === 'mf') A[i.id] = [5, 3, 4, 2, 1, 4][n % 6];
  });
  return A;
}
const run = (A: Mutable, seconds = 6) => {
  const { T, W } = timing(A, seconds);
  return quality(A, T, W);
};

describe('quality checks', () => {
  it('clean run is graded High with every check good', () => {
    const q = run(clean());
    for (const c of Object.values(q.r)) expect(c.state).toBe('good');
    expect(q.grade).toEqual({ t: 'High', s: 'good' });
  });

  it('attention: only "Somewhat disagree" (2) passes', () => {
    for (const [v, s] of [
      [2, 'good'],
      [1, 'bad'],
      [3, 'bad'],
      [5, 'bad'],
    ] as const)
      expect(run({ ...clean(), AC: v }).r.attn.state).toBe(s);
    const A = clean();
    delete A.AC;
    expect(run(A).r.attn).toMatchObject({ state: 'bad', value: 'Missed' });
  });

  it('infrequency: 1 or 2 pass, 3–5 fail', () => {
    for (const [v, s] of [
      [1, 'good'],
      [2, 'good'],
      [3, 'bad'],
      [4, 'bad'],
      [5, 'bad'],
    ] as const)
      expect(run({ ...clean(), IF: v }).r.infreq.state).toBe(s);
  });

  it('contradictory pairs: warn above 15%, bad above 30% of answered pairs', () => {
    const pairs = [...new Set(ITEMS.filter(isPaired).map((i) => i.pair))];
    expect(pairs).toHaveLength(24);
    const withContra = (n: number) => {
      const A = clean();
      for (const p of pairs.slice(0, n)) {
        A[p + 'a'] = 4;
        A[p + 'b'] = 4;
      }
      return run(A).r.contra;
    };
    expect(withContra(3)).toMatchObject({ state: 'good', value: '3 of 24' }); // 12.5%
    expect(withContra(4).state).toBe('warn'); // 16.7%
    expect(withContra(7).state).toBe('warn'); // 29.2%
    expect(withContra(8).state).toBe('bad'); // 33.3%
  });

  it('contradictions only count on scales that have a score', () => {
    const A = clean();
    // Mark 5 of 12 social items No opinion → social not scored; one of its remaining pairs contradicted.
    ['S1a', 'S1b', 'S2a', 'S2b', 'S3a'].forEach((id) => (A[id] = 0));
    A.S4a = 4;
    A.S4b = 4;
    expect(run(A).r.contra.value).toBe('0 of 18');
  });

  it('agreement tendency: warn above |0.45|, bad above |0.75|', () => {
    const paired = ITEMS.filter(isPaired);
    const acq = (vals: (n: number) => number) => {
      const A = clean();
      paired.forEach((i, n) => (A[i.id] = vals(n)));
      return run(A).r.acq;
    };
    expect(acq((n) => (n < 12 ? 4 : 3))).toMatchObject({ state: 'good', value: '+0.25' });
    expect(acq((n) => (n < 24 ? 4 : 3))).toMatchObject({ state: 'warn', value: '+0.50' });
    expect(acq(() => 4).state).toBe('bad');
    expect(acq(() => 2)).toMatchObject({ state: 'bad', value: '-1.00' });
    expect(acq((n) => (n < 24 ? 2 : 3)).state).toBe('warn');
  });

  it('response variety: warn below 0.85, bad below 0.6', () => {
    const variety = (vals: (n: number) => number) => {
      const A = clean();
      ITEMS.forEach((i, n) => (A[i.id] = vals(n)));
      return run(A).r.spread;
    };
    expect(variety(() => 3)).toMatchObject({ state: 'bad', value: '0.00' });
    expect(variety((n) => [3, 4][n % 2]).state).toBe('bad'); // ≈ 0.50
    expect(variety((n) => [2, 3, 4][n % 3]).state).toBe('warn'); // ≈ 0.82
    expect(variety((n) => [1, 3, 5][n % 3]).state).toBe('good'); // ≈ 1.64
  });

  it('speed: warn above 15%, bad above 30% answered faster than reading speed', () => {
    const ids = Array.from({ length: 20 }, (_, i) => 'X' + i);
    const W = Object.fromEntries(ids.map((id) => [id, 10])); // threshold 0.5 + 1.5 = 2.0 s
    const T = (fast: number) => Object.fromEntries(ids.map((id, i) => [id, i < fast ? 1900 : 2100]));
    expect(tooFastShare(T(3), W)).toBe(0.15);
    expect(tooFastShare(T(4), W)).toBe(0.2);
    const A = clean();
    const { T: t6, W: w } = timing(A, 6);
    const ids2 = Object.keys(t6).filter((id) => id !== 'SP');
    const withFast = (n: number) => {
      const t = { ...t6 };
      ids2.slice(0, n).forEach((id) => (t[id] = 100));
      return quality(A, t, w).r.speed.state;
    };
    const n = ids2.length; // 68 timed answers
    expect(withFast(Math.floor(n * 0.15))).toBe('good');
    expect(withFast(Math.floor(n * 0.15) + 1)).toBe('warn');
    expect(withFast(Math.floor(n * 0.3))).toBe('warn');
    expect(withFast(Math.floor(n * 0.3) + 1)).toBe('bad');
  });

  it('speed ignores self-placement, zero times and items without a word count', () => {
    expect(tooFastShare({ SP: 10, A: 0, B: 100 }, { SP: 5, A: 5 })).toBe(0);
    expect(tooFastShare({}, {})).toBe(0);
  });

  it('no-opinion count: warn above 7, bad above 14 of 66', () => {
    const miss = (n: number) => {
      const A = clean();
      // Spread No opinion across scales so no scale drops below 60% answered.
      ITEMS.slice(0, n).forEach((i) => (A[i.id] = 0));
      return run(A).r.miss;
    };
    expect(miss(7)).toMatchObject({ state: 'good', value: '7 of 66' });
    expect(miss(8).state).toBe('warn');
    expect(miss(14).state).toBe('warn');
    expect(miss(15).state).toBe('bad');
  });

  it('grade: High = 0 bad and ≤1 warn; Moderate = ≤1 bad; Low otherwise', () => {
    const oneWarn = { ...clean() };
    ITEMS.slice(0, 8).forEach((i) => (oneWarn[i.id] = 0));
    expect(run(oneWarn).grade.t).toBe('High');

    const oneBad = { ...clean(), AC: 4 };
    expect(run(oneBad).grade.t).toBe('Moderate');

    const twoWarn = { ...oneWarn };
    expect(run(twoWarn, 0.1).r.speed.state).toBe('bad');
    const { T, W } = timing(twoWarn, 6);
    Object.keys(T)
      .slice(0, 12)
      .forEach((id) => (T[id] = 100)); // ≈ 18% fast → warn
    const q = quality(twoWarn, T, W);
    expect(q.r.speed.state).toBe('warn');
    expect(q.grade.t).toBe('Moderate');

    expect(run({ ...clean(), AC: 4, IF: 5 }).grade).toEqual({ t: 'Low', s: 'bad' });
  });
});

describe('sanity cases (docs/HANDOFF.md §1.5)', () => {
  it('all "Strongly agree" at 0.9 s each: every score 0, six checks bad, grade Low', () => {
    const A: Mutable = { AC: 5, IF: 5, SP: 5 };
    for (const i of ITEMS) A[i.id] = 5;
    const q = run(A, 0.9);
    for (const k of ['attn', 'infreq', 'contra', 'acq', 'spread', 'speed'] as const)
      expect(q.r[k].state, k).toBe('bad');
    expect(q.r.miss.state).toBe('good');
    expect(q.grade.t).toBe('Low');
    expect(ALL_SCALES.length).toBe(6);
  });
});
