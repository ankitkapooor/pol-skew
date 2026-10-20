export interface BOption {
  code: number;
  label: string;
}
export interface BranchFollowUp {
  question: string;
  options: (BOption & { summary: number })[];
}
export interface BenchmarkItem {
  id: string;
  source: 'anes2024' | 'ces2024';
  year: number;
  variable: string;
  components?: string[];
  questionId: string;
  intro: string | null;
  question: string;
  format: 'scale7' | 'binary' | 'branch';
  branch?: {
    first: BOption[];
    followUp: Record<string, BranchFollowUp>;
    terminal: Record<string, number>;
  };
  /** Substantive codes as stored in the source (for branch items, the summary variable). */
  options: BOption[];
  offeredNonSubstantive: BOption[];
  missingCodes: number[];
  dimension: string;
  direction: 1 | -1;
  composite: 'econ' | 'social' | null;
  stepScale?: number;
  neutralityNote?: string;
}
export interface SourceInfo {
  name: string;
  short: string;
  release: string;
  population: string;
  citation: string;
  url?: string;
  weight: string;
}
export interface CompositeDef {
  source: 'anes2024' | 'ces2024';
  items: string[];
  label: string;
  negWord: string;
  posWord: string;
  method: string;
}
export interface BenchmarkSpec {
  version: string;
  sources: Record<string, SourceInfo>;
  items: BenchmarkItem[];
  composites: Record<'econ' | 'social', CompositeDef>;
}

export interface PercentileRow {
  value: number;
  below: number;
  equal: number;
  above: number;
}
export interface Norms {
  itemsVersion: string;
  synthetic: boolean;
  builtOn: string;
  scriptGitHash: string;
  sources: Record<
    string,
    SourceInfo & { file: string; sha256: string; unweightedN: number; weightedN: number }
  >;
  items: Record<
    string,
    {
      source: string;
      variable: string;
      unweightedN: number;
      weightedN: number;
      shares: Record<string, number | null>;
    }
  >;
  composites: Record<
    string,
    {
      source: string;
      items: string[];
      min: number;
      max: number;
      unweightedN: number;
      weightedN: number;
      table: PercentileRow[];
    }
  >;
}

/** Benchmark answers: item id → source code (summary code for branch items); SKIPPED when skipped. */
export type BenchmarkAnswers = Record<string, number>;
export const SKIPPED = -1;
