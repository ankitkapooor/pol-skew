/* Pure benchmark scoring. Mirrors scripts/norms/weighted.py (keyed_step, mid_percentile). */
import type {
  BenchmarkAnswers,
  BenchmarkItem,
  CompositeDef,
  Norms,
  PercentileRow,
  SourceInfo,
} from './types';

/** Integer step toward the + pole (0 = left / progressive) for a substantive code, else null. */
export function keyedStep(item: BenchmarkItem, code: number | undefined): number | null {
  if (code === undefined) return null;
  const codes = item.options.map((o) => o.code);
  if (!codes.includes(code)) return null;
  const lo = Math.min(...codes);
  const hi = Math.max(...codes);
  return (item.direction > 0 ? code - lo : hi - code) * (item.stepScale ?? 1);
}

/** Composite value (sum of steps) when every item in it has a substantive answer, else null. */
export function compositeValue(
  def: CompositeDef,
  items: readonly BenchmarkItem[],
  answers: BenchmarkAnswers,
): number | null {
  let sum = 0;
  for (const id of def.items) {
    const item = items.find((i) => i.id === id);
    const s = item ? keyedStep(item, answers[id]) : null;
    if (s === null) return null;
    sum += s;
  }
  return sum;
}

/** P(Y < y) + ½ P(Y = y). */
export const midPercentile = (row: PercentileRow): number => row.below + row.equal / 2;

export interface CompositeReading {
  value: number;
  /** Share of the population the respondent is further toward `side` than (mid-rank). */
  share: number;
  side: 'neg' | 'pos';
  sentence: string;
}

export function readComposite(
  def: CompositeDef,
  table: readonly PercentileRow[],
  value: number,
  src: Pick<SourceInfo, 'short' | 'population'>,
): CompositeReading | null {
  const row = table.find((r) => r.value === value);
  if (!row) return null;
  const p = midPercentile(row); // share "more negative-pole" than you, i.e. more left
  const moreNeg = 1 - p; // share more right than you → you are more left than them
  const side = moreNeg >= p ? 'neg' : 'pos';
  const share = side === 'neg' ? moreNeg : p;
  const word = side === 'neg' ? def.negWord : def.posWord;
  const pct = Math.round(share * 100);
  return {
    value,
    share,
    side,
    sentence: `More ${word} than about ${pct}% of ${src.population} (${src.short}, weighted).`,
  };
}

/** Label for a chosen code, e.g. "3" on an unlabelled scale point or "Favor a little". */
export function optionLabel(item: BenchmarkItem, code: number): string {
  const o = [...item.options, ...item.offeredNonSubstantive].find((x) => x.code === code);
  if (!o) return String(code);
  if (item.format === 'scale7') return o.label ? `${code} (${o.label})` : `${code}`;
  return o.label;
}

export function itemCard(
  item: BenchmarkItem,
  code: number | undefined,
  norms: Norms,
): { chosen: string; share: number | null; sentence: string } | null {
  if (code === undefined || code < 0) return null;
  const d = norms.items[item.id];
  const share = d?.shares[String(code)] ?? null;
  const pop = norms.sources[item.source]?.population ?? 'U.S. adults';
  const chosen = optionLabel(item, code);
  const sentence =
    share === null
      ? `You chose ${chosen}.`
      : `You chose ${chosen}. ${Math.round(share * 100)}% of ${pop} chose ${item.format === 'scale7' ? 'point ' + code : 'this'}.`;
  return { chosen, share, sentence };
}
