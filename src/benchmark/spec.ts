import raw from '../../data/benchmark-items.json';
import type { BenchmarkItem, BenchmarkSpec } from './types';

export const SPEC = raw as unknown as BenchmarkSpec;
export const BENCHMARK_ITEMS: readonly BenchmarkItem[] = SPEC.items;
export const benchmarkItem = (id: string): BenchmarkItem => {
  const it = SPEC.items.find((i) => i.id === id);
  if (!it) throw new Error(`Unknown benchmark item: ${id}`);
  return it;
};
