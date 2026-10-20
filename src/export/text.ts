import { SPEC, BENCHMARK_ITEMS } from '../benchmark/spec';
import {
  ALL_SCALES,
  ATTN,
  CORE,
  DIMS,
  FOUNDATIONS,
  INFREQ,
  ITEMS,
  LIKERT,
  MF_NAMES,
  SELF_OPTS,
  SHORT,
} from '../instrument/items';
import { axisWord } from '../scoring/labels';
import { CHECK_ORDER } from '../scoring/quality';
import type { Results } from '../scoring/results';
import type { RunState } from '../state/storage';
import { DISCLAIMER, SITE, TITLE, signed } from './common';

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

export interface ExportMeta {
  version: string;
  /** Date the run was completed (YYYY-MM-DD). */
  completedOn: string;
}

const answerText = (a: number | undefined): string =>
  a === undefined ? '-' : a === 0 ? 'No opinion' : (LIKERT[a - 1] ?? String(a));

/** Full plain-text report: every scale, band, label, MF profile, quality checks, answers. */
export function textReport(S: RunState, R: Results, meta: ExportMeta): string {
  const out: string[] = [];
  const rule = '-'.repeat(72);
  const scaleLine = (d: (typeof ALL_SCALES)[number]) => {
    const r = R.sc[d];
    if (!r.ok) return `  ${DIMS[d].name.padEnd(22)} too few answers (${r.n} of ${r.total})`;
    return `  ${DIMS[d].name.padEnd(22)} ${signed(r.score).padStart(4)}  band ${signed(r.lo)} to ${signed(r.hi)} (±${Math.round(r.half)})  ${axisWord(d, r.score)}  [${r.n}/${r.total} answered]`;
  };
  out.push(`${TITLE}: results`, rule);
  out.push(`Result:            ${R.verdict.title}`);
  out.push(`                   ${R.verdict.body}`);
  out.push(`Data quality:      ${R.q.grade.t}`);
  out.push(`Completed:         ${meta.completedOn}`);
  out.push(`Instrument:        ${meta.version}`);
  out.push(`Source:            https://${SITE}`);
  out.push('', DISCLAIMER, '');
  out.push('CORE SCALES (−100 to +100; band = item-to-item spread, not retest reliability)');
  CORE.forEach((d) => out.push(scaleLine(d)));
  out.push('', 'SHORT SCALES (4 statements each, indicative only)');
  SHORT.forEach((d) => out.push(scaleLine(d)));
  out.push('', 'POLES');
  ALL_SCALES.forEach((d) => out.push(`  ${DIMS[d].name.padEnd(22)} − ${DIMS[d].neg} / + ${DIMS[d].pos}`));
  out.push('', 'MORAL FOUNDATIONS (relative to your own average; raw 1–5 mean in brackets)');
  FOUNDATIONS.forEach((f) => {
    const x = R.mf.f[f];
    out.push(
      `  ${MF_NAMES[f].padEnd(16)} ${x ? `${(x.rel >= 0 ? '+' : '') + x.rel.toFixed(2)} (${x.raw.toFixed(1)})` : '-'}`,
    );
  });
  if (R.mfRead) out.push('  ' + R.mfRead.text);
  out.push('', 'LABEL VS. POSITIONS');
  out.push(`  Self-placement: ${S.answers.SP ? SELF_OPTS[S.answers.SP - 1] : 'not recorded'}`);
  if (R.self) out.push('  ' + R.self.text);
  out.push('', `DATA QUALITY: ${R.q.grade.t}`);
  CHECK_ORDER.forEach((k) => {
    const c = R.q.r[k];
    out.push(`  [${c.state.toUpperCase().padEnd(4)}] ${c.label}: ${c.value}`);
  });
  if (S.benchmark?.done) {
    out.push(
      '',
      `U.S. BENCHMARK ANSWERS (asked in original ${Object.values(SPEC.sources)
        .map((s) => s.short)
        .join(' / ')} wording)`,
    );
    BENCHMARK_ITEMS.forEach((it) => {
      const v = S.benchmark!.answers[it.id];
      const o = [...it.options, ...it.offeredNonSubstantive].find((x) => x.code === v);
      out.push(
        `  ${it.variable.padEnd(10)} ${v === undefined || v < 0 ? 'skipped' : o?.label ? `${v} ${o.label}` : String(v)}`,
      );
    });
  }
  out.push('', 'YOUR ANSWERS (a/b = the two sides of one pair; * = contradicted pair)');
  [...ITEMS, ATTN, INFREQ].forEach((it) => {
    const mark = 'pair' in it && R.contraPairs.has(it.pair) ? '*' : ' ';
    out.push(`  ${mark}${it.id.padEnd(4)} ${answerText(S.answers[it.id]).padEnd(27)} ${it.text}`);
  });
  out.push('', rule);
  out.push('Cutoffs are provisional: under 15 centrist, 15–40 leaning, 40–70 moderately, 70+ strongly.');
  out.push('They come from what the answers mean, not from population data.');
  return out.join('\n') + '\n';
}

/** Machine-readable export of raw answers and scores for people who want their data. */
export function jsonExport(S: RunState, R: Results, meta: ExportMeta & { exportedOn: string }) {
  return {
    instrument: TITLE,
    instrumentVersion: meta.version,
    completedOn: meta.completedOn,
    exportedOn: meta.exportedOn,
    disclaimer: DISCLAIMER,
    itemOrder: S.order,
    answers: S.answers,
    responseTimesMs: S.times,
    result: { title: R.verdict.title, placed: R.placed },
    scales: R.sc,
    moralFoundations: R.mf,
    selfPlacement: R.self ? { kind: R.self.kind, text: R.self.text } : null,
    quality: {
      grade: R.q.grade.t,
      checks: Object.fromEntries(
        CHECK_ORDER.map((k) => [k, { state: R.q.r[k].state, value: R.q.r[k].value }]),
      ),
    },
    contradictedPairs: [...R.contraPairs].sort(),
    benchmark: S.benchmark?.done ? { itemsVersion: SPEC.version, answers: S.benchmark.answers } : null,
  };
}
