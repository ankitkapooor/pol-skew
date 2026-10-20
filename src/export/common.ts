/** Required on every export (docs/HANDOFF.md, Task 4). Update once norms and validation data replace it. */
export const DISCLAIMER =
  'Not a validated or norm-referenced instrument; 0 is the scale midpoint, not the average person.';
export const SITE = 'polskew.ankitkapoor.me';
export const TITLE = 'Ideology Inventory';

/** Light palette used by every export, whatever the on-screen theme (mirrors src/styles/tokens.css). */
export const LIGHT = {
  bg: '#F5F5F7',
  surface: '#FFFFFF',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  line: '#D2D2D7',
  /** Teal used for the respondent's marks (--mark). */
  accent: '#0891A8',
  /** --band (teal at 20%) over white, as a solid colour for PDF. */
  accentSoft: '#D6EFF4',
  good: '#248A3D',
  warn: '#B25000',
  bad: '#D70015',
} as const;

export const signed = (v: number): string => (v > 0 ? '+' : '') + Math.round(v);

/** File-name stem, e.g. "ideology-inventory-2026-10-19". */
export const fileStem = (date: string): string => `ideology-inventory-${date}`;

export const todayISO = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
