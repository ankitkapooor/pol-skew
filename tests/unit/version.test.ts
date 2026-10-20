import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { fingerprintSource } from '../../src/instrument/fingerprint';
import {
  INSTRUMENT_HASH,
  INSTRUMENT_SEMVER,
  INSTRUMENT_VERSION,
  KNOWN_VERSIONS,
  VERSION_HISTORY,
} from '../../src/instrument/version';

describe('INSTRUMENT_VERSION', () => {
  it('matches the current item bank and scoring constants (run `npm run version:gen` and bump semver if not)', () => {
    const hash = createHash('sha256').update(fingerprintSource()).digest('hex').slice(0, 8);
    expect(INSTRUMENT_HASH).toBe(hash);
  });
  it('is semver+hash and listed first in the version history', () => {
    expect(INSTRUMENT_VERSION).toMatch(/^\d+\.\d+\.\d+\+[0-9a-f]{8}$/);
    expect(VERSION_HISTORY[0]).toEqual({ semver: INSTRUMENT_SEMVER, hash: INSTRUMENT_HASH });
    expect(KNOWN_VERSIONS).toContain(INSTRUMENT_VERSION);
    expect(new Set(VERSION_HISTORY.map((v) => v.semver)).size).toBe(VERSION_HISTORY.length);
  });
  it('changes when wording changes', () => {
    const a = fingerprintSource();
    expect(a).toContain('Taxes on high earners');
    expect(a).toContain('"MIN_ANSWERED_SHARE":0.6');
  });
});
