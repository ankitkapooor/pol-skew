import { ALL_SCALES, DIMS, FOUNDATIONS, MF_NAMES } from '../instrument/items';
import { axisWord } from '../scoring/labels';
import type { Results } from '../scoring/results';

const sgn = (v: number): string => (v > 0 ? '+' : '') + Math.round(v);

/** The short "Copy summary" text from the prototype. */
export function shortSummary(R: Results): string {
  const { sc, mf, q } = R;
  return [
    'Ideology Inventory result: ' + R.verdict.title,
    ...ALL_SCALES.flatMap((d) => {
      const r = sc[d];
      return r.ok
        ? [`${DIMS[d].name}: ${sgn(r.score)} (±${Math.round(r.half)}), ${axisWord(d, r.score)}`]
        : [];
    }),
    'Moral foundations vs. own average: ' +
      FOUNDATIONS.filter((f) => mf.f[f])
        .map((f) => MF_NAMES[f] + ' ' + (mf.f[f]!.rel >= 0 ? '+' : '') + mf.f[f]!.rel.toFixed(2))
        .join(', '),
    'Data quality: ' + q.grade.t,
  ].join('\n');
}
