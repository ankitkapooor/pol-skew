import { ORDER } from '../scoring/constants';
import { ITEMS, byId, isPaired } from './items';

/** Returns a float in [0, 1). Injected so tests can use a seeded generator. */
export type Rng = () => number;

export function shuffle<T>(a: T[], rng: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const dimOf = (id: string): string => {
  const it = byId(id);
  return 'dim' in it ? it.dim : it.type;
};

/** No scale three times in a row, and the two halves of a pair at least ORDER.minPairGap positions apart. */
export function orderOK(ids: readonly string[]): boolean {
  for (let i = 2; i < ids.length; i++) {
    const d = dimOf(ids[i]);
    if (d === dimOf(ids[i - 1]) && d === dimOf(ids[i - 2])) return false;
  }
  const pos = new Map<string, number>();
  for (let i = 0; i < ids.length; i++) {
    const it = byId(ids[i]);
    if (!isPaired(it)) continue;
    const prev = pos.get(it.pair);
    if (prev !== undefined && i - prev < ORDER.minPairGap) return false;
    pos.set(it.pair, i);
  }
  return true;
}

/** Full run order: shuffled statements meeting orderOK, AC at 20–29, IF at 44–53, SP last. */
export function newOrder(rng: Rng = Math.random): string[] {
  let ids: string[] = [];
  for (let t = 0; t < ORDER.maxTries; t++) {
    ids = shuffle(
      ITEMS.map((i) => i.id),
      rng,
    );
    if (orderOK(ids)) break;
    if (t === ORDER.maxTries - 1) throw new Error('Could not build a valid item order');
  }
  ids.splice(ORDER.attnStart + Math.floor(rng() * ORDER.insertWindow), 0, 'AC');
  ids.splice(ORDER.infreqStart + Math.floor(rng() * ORDER.insertWindow), 0, 'IF');
  ids.push('SP');
  return ids;
}

/** Small, fast seeded PRNG (mulberry32) for tests and reproducible orders. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
