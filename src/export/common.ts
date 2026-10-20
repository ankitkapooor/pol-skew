/** Required on every export (docs/HANDOFF.md, Task 4). Update once norms and validation data replace it. */
export const DISCLAIMER =
  'Not a validated or norm-referenced instrument; 0 is the scale midpoint, not the average person.';
export const SITE = 'polskew.ankitkapoor.me';
export const TITLE = 'Ideology Inventory';

/** Light palette used by every export, whatever the on-screen theme (mirrors src/styles/tokens.css). */
export const LIGHT = {
  bg: '#ECEEF2',
  surface: '#F8F9FB',
  ink: '#14171C',
  muted: '#5A6170',
  line: '#D2D6DE',
  accent: '#2F43C8',
  /** accent at 12% over surface, as a solid colour for PDF. */
  accentSoft: '#E0E3F5',
  good: '#1D7A4B',
  warn: '#9A5C00',
  bad: '#B3261E',
} as const;

export const signed = (v: number): string => (v > 0 ? '+' : '') + Math.round(v);

/** File-name stem, e.g. "ideology-inventory-2026-10-19". */
export const fileStem = (date: string): string => `ideology-inventory-${date}`;

export const todayISO = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
