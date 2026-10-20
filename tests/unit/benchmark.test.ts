import { describe, expect, it } from 'vitest';
import fixture from '../../data/norms/fixture-synthetic.json';
import { BENCHMARK_ITEMS, SPEC, benchmarkItem } from '../../src/benchmark/spec';
import { compositeValue, itemCard, keyedStep, midPercentile, readComposite } from '../../src/benchmark/score';
import type { Norms } from '../../src/benchmark/types';
import { ITEMS } from '../../src/instrument/items';

const norms = fixture as unknown as Norms;

describe('benchmark spec', () => {
  it('has 10–12 items with unique ids and known sources', () => {
    expect(BENCHMARK_ITEMS.length).toBeGreaterThanOrEqual(10);
    expect(BENCHMARK_ITEMS.length).toBeLessThanOrEqual(12);
    expect(new Set(BENCHMARK_ITEMS.map((i) => i.id)).size).toBe(BENCHMARK_ITEMS.length);
    for (const i of BENCHMARK_ITEMS) expect(Object.keys(SPEC.sources)).toContain(i.source);
  });

  it('keeps benchmark ids distinct from instrument ids', () => {
    const ids = new Set(ITEMS.map((i) => i.id));
    for (const i of BENCHMARK_ITEMS) expect(ids.has(i.id)).toBe(false);
  });

  it('defines composites from one source with steps 0–6 per item', () => {
    for (const def of Object.values(SPEC.composites)) {
      for (const id of def.items) {
        const it = benchmarkItem(id);
        expect(it.source).toBe(def.source);
        const steps = it.options.map((o) => keyedStep(it, o.code));
        expect(Math.min(...(steps as number[]))).toBe(0);
        expect(Math.max(...(steps as number[]))).toBe(6);
      }
    }
  });

  it('maps every branch path to a summary code', () => {
    for (const it of BENCHMARK_ITEMS.filter((i) => i.format === 'branch')) {
      const summaries = new Set<number>();
      for (const f of it.branch!.first) {
        const t = it.branch!.terminal[String(f.code)];
        if (t !== undefined) summaries.add(t);
        else for (const o of it.branch!.followUp[String(f.code)].options) summaries.add(o.summary);
      }
      expect([...summaries].sort()).toEqual(it.options.map((o) => o.code).sort());
    }
  });

  it('includes the ANES liberal–conservative self-placement verbatim', () => {
    const lc = benchmarkItem('anes_libcon');
    expect(lc.variable).toBe('V241177');
    expect(lc.options.map((o) => o.label)).toContain('Moderate; middle of the road');
  });
});

describe('benchmark scoring', () => {
  it('keys reversed and stepped items like the Python pipeline', () => {
    const services = benchmarkItem('anes_services'); // direction −1: 7 = more services = left
    expect(keyedStep(services, 7)).toBe(0);
    expect(keyedStep(services, 1)).toBe(6);
    expect(keyedStep(services, 99)).toBeNull();
    expect(keyedStep(services, undefined)).toBeNull();
    const gay = benchmarkItem('anes_gay_jobs');
    expect([1, 2, 3, 4].map((c) => keyedStep(gay, c))).toEqual([0, 2, 4, 6]);
  });

  it('needs every composite item answered substantively', () => {
    const def = SPEC.composites.econ;
    expect(compositeValue(def, BENCHMARK_ITEMS, { anes_services: 7, anes_insurance: 1, anes_jobs: 4 })).toBe(
      3,
    );
    expect(
      compositeValue(def, BENCHMARK_ITEMS, { anes_services: 7, anes_insurance: 99, anes_jobs: 4 }),
    ).toBeNull();
    expect(compositeValue(def, BENCHMARK_ITEMS, { anes_services: 7, anes_jobs: 4 })).toBeNull();
  });

  it('reads a hand-computed table (same fixture as the Python test)', () => {
    const table = [
      { value: 0, below: 0, equal: 1 / 8, above: 7 / 8 },
      { value: 2, below: 1 / 8, equal: 3 / 8, above: 4 / 8 },
      { value: 5, below: 4 / 8, equal: 4 / 8, above: 0 },
    ];
    expect(midPercentile(table[1])).toBeCloseTo(0.3125, 10);
    const src = { short: 'ANES 2024', population: 'U.S. adult citizens' };
    const r = readComposite(SPEC.composites.econ, table, 2, src)!;
    expect(r.side).toBe('neg');
    expect(r.sentence).toBe(
      'More economically left than about 69% of U.S. adult citizens (ANES 2024, weighted).',
    );
    const hi = readComposite(SPEC.composites.econ, table, 5, src)!;
    expect(hi.sentence).toBe(
      'More economically right than about 75% of U.S. adult citizens (ANES 2024, weighted).',
    );
    expect(readComposite(SPEC.composites.econ, table, 9, src)).toBeNull();
  });

  it('writes per-item cards from the distribution', () => {
    const it = benchmarkItem('ces_medicaid');
    const card = itemCard(it, 1, norms)!;
    const share = norms.items.ces_medicaid.shares['1']!;
    expect(card.sentence).toBe(`You chose Support. ${Math.round(share * 100)}% of U.S. adults chose this.`);
    expect(itemCard(it, -1, norms)).toBeNull();
    expect(itemCard(benchmarkItem('anes_jobs'), 3, norms)!.sentence).toMatch(
      /^You chose 3\. \d+% of U\.S\. adult citizens chose point 3\.$/,
    );
  });

  it('fixture norms cover every item and are marked synthetic', () => {
    expect(norms.synthetic).toBe(true);
    for (const it of BENCHMARK_ITEMS) expect(norms.items[it.id]).toBeDefined();
  });
});
