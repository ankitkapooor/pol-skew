/** Writes data/instrument-key.json: the item key used by the R analysis scripts. Kept in sync by a unit test. */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { instrumentKey } from '../src/instrument/key';

const out = fileURLToPath(new URL('../data/instrument-key.json', import.meta.url));
writeFileSync(out, JSON.stringify(instrumentKey(), null, 1) + '\n');
console.log(`Wrote ${out}`);
