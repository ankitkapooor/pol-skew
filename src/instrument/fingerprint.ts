import * as C from '../scoring/constants';
import { ITEMS, LIKERT, SELF_OPTS, SPECIAL } from './items';

/**
 * Canonical serialization of everything that changes what a response means or how it is scored:
 * item wording and keying, response options, and scoring constants. Its SHA-256 (first 8 hex chars)
 * is the build hash in INSTRUMENT_VERSION.
 */
export function fingerprintSource(): string {
  const constants = Object.fromEntries(Object.entries(C).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({ items: ITEMS, special: SPECIAL, likert: LIKERT, selfOpts: SELF_OPTS, constants });
}
