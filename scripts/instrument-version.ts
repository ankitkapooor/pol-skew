/**
 * Computes the instrument hash and checks or rewrites src/instrument/version.ts.
 *   --check  fail if the committed hash is stale (used by `npm run build` and CI)
 *   --write  update the hash; refuses if the hash changed but INSTRUMENT_SEMVER was not bumped
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fingerprintSource } from '../src/instrument/fingerprint';
import { INSTRUMENT_HASH, INSTRUMENT_SEMVER, VERSION_HISTORY } from '../src/instrument/version';

export const computeHash = (): string =>
  createHash('sha256').update(fingerprintSource()).digest('hex').slice(0, 8);

const file = fileURLToPath(new URL('../src/instrument/version.ts', import.meta.url));
const hash = computeHash();
const mode = process.argv[2];

if (mode === '--check') {
  if (hash !== INSTRUMENT_HASH) {
    console.error(
      `Instrument hash is stale: committed ${INSTRUMENT_HASH}, computed ${hash}.\n` +
        'Item wording, keying or scoring constants changed. Bump INSTRUMENT_SEMVER in src/instrument/version.ts, ' +
        'then run `npm run version:gen`.',
    );
    process.exit(1);
  }
  console.log(`Instrument ${INSTRUMENT_SEMVER}+${hash} is current.`);
} else if (mode === '--write') {
  if (hash === INSTRUMENT_HASH) {
    console.log('Hash unchanged; nothing to do.');
    process.exit(0);
  }
  const prior = VERSION_HISTORY.find((v) => v.semver === INSTRUMENT_SEMVER);
  if (prior && prior.hash !== hash) {
    console.error(
      `INSTRUMENT_SEMVER ${INSTRUMENT_SEMVER} was already released with hash ${prior.hash}. Bump it before regenerating.`,
    );
    process.exit(1);
  }
  const src = readFileSync(file, 'utf8')
    .replace(/export const INSTRUMENT_HASH = '[0-9a-f]*';/, `export const INSTRUMENT_HASH = '${hash}';`)
    .replace(
      /(export const VERSION_HISTORY[^=]*= \[\n)/,
      `$1  { semver: '${INSTRUMENT_SEMVER}', hash: '${hash}' },\n`,
    );
  writeFileSync(file, src);
  console.log(`Wrote ${INSTRUMENT_SEMVER}+${hash}.`);
} else {
  console.log(hash);
}
