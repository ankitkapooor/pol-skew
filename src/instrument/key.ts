import { CORE, ITEMS, SHORT, isMF, isPaired } from './items';
import { INSTRUMENT_VERSION } from './version';

/** Machine-readable item key for analysis scripts (no wording, which lives in items.ts). */
export function instrumentKey() {
  return {
    instrumentVersion: INSTRUMENT_VERSION,
    core: CORE,
    short: SHORT,
    paired: ITEMS.filter(isPaired).map(({ id, pair, dim, dir }) => ({ id, pair, dim, dir })),
    mf: ITEMS.filter(isMF).map(({ id, f }) => ({ id, f })),
  };
}
