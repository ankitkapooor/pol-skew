import { describe, expect, it } from 'vitest';
import { ITEMS, byId, isPaired } from '../../src/instrument/items';
import { mulberry32, newOrder, orderOK, shuffle } from '../../src/instrument/order';

describe('orderOK', () => {
  it('rejects three items from the same scale in a row', () => {
    const econ = ITEMS.filter((i) => i.dim === 'econ').map((i) => i.id);
    expect(orderOK(['E1a', 'E2a', 'E3a'])).toBe(false);
    expect(orderOK(['E1a', 'E2a', 'S1a', 'E3a'])).toBe(true);
    expect(econ.length).toBe(12);
  });

  it('rejects pair halves fewer than 8 positions apart', () => {
    const filler = ['S1a', 'A1a', 'M1', 'S2a', 'A2a', 'M2', 'S3a'];
    expect(orderOK(['E1a', ...filler, 'E1b'])).toBe(true); // 8 apart
    expect(orderOK(['E1a', ...filler.slice(1), 'E1b'])).toBe(false); // 7 apart
  });
});

describe('newOrder', () => {
  it('meets every constraint across many seeds', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const ids = newOrder(mulberry32(seed));
      expect(ids).toHaveLength(69);
      expect(new Set(ids).size).toBe(69);
      expect(ids.at(-1)).toBe('SP');
      const ac = ids.indexOf('AC');
      const inf = ids.indexOf('IF');
      expect(ac).toBeGreaterThanOrEqual(20);
      expect(ac).toBeLessThanOrEqual(29);
      expect(inf).toBeGreaterThanOrEqual(44);
      expect(inf).toBeLessThanOrEqual(53);
      const statements = ids.filter((id) => !['AC', 'IF', 'SP'].includes(id));
      expect(orderOK(statements)).toBe(true);
      // Inserting the checks only ever widens gaps, so the pair rule holds on the full order too.
      const pos = new Map<string, number>();
      ids.forEach((id, i) => {
        const it = byId(id);
        if (!isPaired(it)) return;
        const prev = pos.get(it.pair);
        if (prev !== undefined) expect(i - prev).toBeGreaterThanOrEqual(8);
        pos.set(it.pair, i);
      });
    }
  });

  it('is reproducible for a given seed and varies across seeds', () => {
    expect(newOrder(mulberry32(7))).toEqual(newOrder(mulberry32(7)));
    expect(newOrder(mulberry32(7))).not.toEqual(newOrder(mulberry32(8)));
  });

  it('shuffle is a permutation', () => {
    const a = [1, 2, 3, 4, 5, 6];
    expect([...shuffle([...a], mulberry32(3))].sort()).toEqual(a);
  });
});
