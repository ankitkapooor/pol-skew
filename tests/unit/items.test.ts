import { describe, expect, it } from 'vitest';
import {
  ALL_SCALES,
  CORE,
  ITEMS,
  SHORT,
  SPECIAL,
  byId,
  isMF,
  isPaired,
  FOUNDATIONS,
} from '../../src/instrument/items';

describe('item bank', () => {
  it('has 66 scored statements, 2 checks and 1 self-placement (69 screens)', () => {
    expect(ITEMS).toHaveLength(66);
    expect(Object.keys(SPECIAL)).toEqual(['AC', 'IF', 'SP']);
  });

  it('has unique ids', () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds every pair as one +1 and one −1 item on the same scale', () => {
    const paired = ITEMS.filter(isPaired);
    expect(paired).toHaveLength(48);
    const pairs = new Set(paired.map((i) => i.pair));
    expect(pairs.size).toBe(24);
    for (const p of pairs) {
      const a = byId(p + 'a');
      const b = byId(p + 'b');
      expect(isPaired(a) && a.dir).toBe(1);
      expect(isPaired(b) && b.dir).toBe(-1);
      expect(isPaired(a) && isPaired(b) && a.dim === b.dim).toBe(true);
    }
  });

  it('gives core scales 12 items and short scales 4 items', () => {
    const count = (d: string) => ITEMS.filter(isPaired).filter((i) => i.dim === d).length;
    for (const d of CORE) expect(count(d)).toBe(12);
    for (const d of SHORT) expect(count(d)).toBe(4);
    expect(ALL_SCALES).toHaveLength(6);
  });

  it('has three items per moral foundation', () => {
    for (const f of FOUNDATIONS) expect(ITEMS.filter(isMF).filter((i) => i.f === f)).toHaveLength(3);
  });

  it('names no party or politician (neutrality rule)', () => {
    const banned =
      /\b(democrat|republican|labou?r party|tory|tories|conservative party|liberal party|bjp|congress party|aap|trump|biden|harris|obama|modi|gandhi|sunak|starmer)\b/i;
    for (const i of [...ITEMS, ...Object.values(SPECIAL)]) expect(i.text).not.toMatch(banned);
  });

  it('throws on unknown ids', () => {
    expect(() => byId('nope')).toThrow();
  });
});
