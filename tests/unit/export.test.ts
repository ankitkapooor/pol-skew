import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../src/instrument/items';
import { mulberry32, newOrder } from '../../src/instrument/order';
import { DISCLAIMER } from '../../src/export/common';
import { jsonExport, shortSummary, textReport } from '../../src/export/text';
import { pdfText } from '../../src/export/pdftext';
import { computeResults } from '../../src/scoring/results';
import type { RunState } from '../../src/state/storage';
import { timing } from './helpers';

function fixedRun(): RunState {
  const answers: Record<string, number> = {};
  ITEMS.forEach((i, n) => (answers[i.id] = [5, 2, 4, 1, 3, 0, 4][n % 7]));
  Object.assign(answers, { AC: 2, IF: 1, SP: 3 });
  const { T, W } = timing(answers, 5);
  return {
    order: newOrder(mulberry32(42)),
    idx: 68,
    answers,
    times: T,
    words: W,
    done: true,
    version: '2.0.0+test0000',
    completedOn: '2026-10-19',
    benchmark: {
      idx: 10,
      done: true,
      answers: { anes_libcon: 3, anes_services: 6, anes_jobs: 99, ces_medicaid: -1 },
    },
  };
}

describe('text export', () => {
  const S = fixedRun();
  const R = computeResults(S.answers, S.times, S.words);
  const meta = { version: S.version!, completedOn: S.completedOn! };

  it('matches the snapshot', () => {
    expect(textReport(S, R, meta)).toMatchSnapshot();
  });

  it('carries version, date, grade and the disclaimer', () => {
    const t = textReport(S, R, meta);
    expect(t).toContain('Instrument:        2.0.0+test0000');
    expect(t).toContain('Completed:         2026-10-19');
    expect(t).toContain(`Data quality:      ${R.q.grade.t}`);
    expect(t).toContain(DISCLAIMER);
    for (const id of ['E1a', 'M18', 'AC', 'IF']) expect(t).toMatch(new RegExp(`\\b${id}\\b`));
  });

  it('keeps the prototype copy summary', () => {
    expect(shortSummary(R).split('\n')[0]).toBe(`Ideology Inventory result: ${R.verdict.title}`);
  });

  it('exports raw answers and scores as JSON', () => {
    const j = jsonExport(S, R, { ...meta, exportedOn: '2026-10-20' });
    expect(j.instrumentVersion).toBe('2.0.0+test0000');
    expect(j.answers).toEqual(S.answers);
    expect(j.disclaimer).toBe(DISCLAIMER);
    expect(j.benchmark?.answers.anes_jobs).toBe(99);
    expect(JSON.parse(JSON.stringify(j)).scales.econ.ok).toBe(true);
  });
});

describe('pdfText', () => {
  it('maps characters outside Latin-1 for the standard PDF fonts', () => {
    expect(pdfText('−100 to +100 – “quoted” ’ ≈ ≥ ≤ → …')).toBe('-100 to +100 - "quoted" \' ~ >= <= -> ...');
    expect(pdfText('± · é')).toBe('± · é');
    expect(pdfText('★')).toBe('?');
  });
});
