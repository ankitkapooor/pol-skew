import { describe, expect, it } from 'vitest';
import { ITEMS, isMF } from '../../src/instrument/items';
import { rankFoundations, scoreMF } from '../../src/scoring/mf';

const mfIds = (f: string) =>
  ITEMS.filter(isMF)
    .filter((i) => i.f === f)
    .map((i) => i.id);

describe('scoreMF', () => {
  it('ipsatizes each foundation against the personal mean', () => {
    const A: Record<string, number> = {};
    for (const id of [...mfIds('care'), ...mfIds('equality')]) A[id] = 5;
    for (const id of [...mfIds('proportionality')]) A[id] = 3;
    for (const id of [...mfIds('loyalty'), ...mfIds('authority'), ...mfIds('purity')]) A[id] = 2;
    const r = scoreMF(A);
    const personal = (6 * 5 + 3 * 3 + 9 * 2) / 18;
    expect(r.personal).toBeCloseTo(personal, 10);
    expect(r.f.care!.raw).toBe(5);
    expect(r.f.care!.rel).toBeCloseTo(5 - personal, 10);
    expect(r.ind).toBe(5);
    expect(r.bin).toBe(2);
    expect(r.diff).toBe(3);
    expect(rankFoundations(r).slice(0, 2).sort()).toEqual(['care', 'equality']);
  });

  it('needs two of three items per foundation and skips No opinion', () => {
    const A: Record<string, number> = {};
    const care = mfIds('care');
    A[care[0]] = 4;
    A[care[1]] = 0;
    expect(scoreMF(A).f.care).toBeNull();
    A[care[2]] = 2;
    expect(scoreMF(A).f.care!.raw).toBe(3);
  });

  it('returns nulls with no answers', () => {
    const r = scoreMF({});
    expect(r.personal).toBeNull();
    expect(r.ind).toBeNull();
    expect(r.diff).toBeNull();
  });
});
