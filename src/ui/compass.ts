/** Colours used by the compass. Defaults are CSS tokens; exports pass literal light-palette values. */
export interface CompassColors {
  surface: string;
  line: string;
  muted: string;
  ink: string;
  accent: string;
  accentSoft: string;
  fData: string;
  fDisplay: string;
  /** Ring around the point, matching whatever the plot sits on. */
  card: string;
  /** Quadrant-label weight; the PDF's standard fonts only know "bold". */
  labelWeight?: string;
}
export const CSS_COLORS: CompassColors = {
  surface: 'var(--alt)',
  line: 'var(--sep)',
  muted: 'var(--muted)',
  ink: 'var(--ink)',
  accent: 'var(--mark)',
  accentSoft: 'var(--band)',
  fData: 'var(--f-text)',
  fDisplay: 'var(--f-text)',
  card: 'var(--card)',
};

export interface CompassOpts {
  id?: string;
  animate?: boolean;
  colors?: CompassColors;
}

/** Plot geometry shared by the SVG and the canvas share card. */
export const COMPASS = { pad: 40, size: 360 } as const;
export const compassX = (v: number): number =>
  COMPASS.pad + ((v + 100) / 200) * (COMPASS.size - 2 * COMPASS.pad);
export const compassY = (v: number): number =>
  COMPASS.pad + ((100 - v) / 200) * (COMPASS.size - 2 * COMPASS.pad);

/** x = economic score, y = social score (traditional up); optional band box for topic-to-topic spread. */
export function compassSVG(
  e: number,
  so: number,
  ce: [number, number] | null,
  cs: [number, number] | null,
  opts: CompassOpts = {},
): string {
  const c = opts.colors ?? CSS_COLORS;
  const Pd = COMPASS.pad;
  const W = COMPASS.size;
  const inner = W - 2 * Pd;
  const X = compassX;
  const Y = compassY;
  const rect =
    ce && cs
      ? `<rect x="${X(ce[0])}" y="${Y(cs[1])}" width="${X(ce[1]) - X(ce[0])}" height="${Y(cs[0]) - Y(cs[1])}" rx="8" fill="${c.accentSoft}"/>`
      : '';
  const q = (x: number, y: number, t: string, a: string) =>
    `<text x="${x}" y="${y}" text-anchor="${a}" font-family="${c.fData}" font-size="9" font-weight="${c.labelWeight ?? '600'}" letter-spacing=".04em" fill="${c.muted}">${t}</text>`;
  const lab = (x: number, y: number, t: string, rot?: number) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="${c.muted}" font-family="${c.fDisplay}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${t}</text>`;
  return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Two-axis plot of economic and social scores" xmlns="http://www.w3.org/2000/svg">
    <rect x="${Pd}" y="${Pd}" width="${inner}" height="${inner}" rx="14" fill="${c.surface}"/>
    <line x1="${X(0)}" y1="${Pd + 8}" x2="${X(0)}" y2="${W - Pd - 8}" stroke="${c.line}"/>
    <line x1="${Pd + 8}" y1="${Y(0)}" x2="${W - Pd - 8}" y2="${Y(0)}" stroke="${c.line}"/>
    ${q(Pd + 14, Pd + 22, 'COMMUNITARIAN', 'start')}${q(W - Pd - 14, Pd + 22, 'CONSERVATIVE', 'end')}
    ${q(Pd + 14, W - Pd - 14, 'LEFT-PROGRESSIVE', 'start')}${q(W - Pd - 14, W - Pd - 14, 'LIBERTARIAN-LEANING', 'end')}
    ${lab(W / 2, Pd - 12, 'Socially traditional')}${lab(W / 2, W - Pd + 22, 'Socially progressive')}
    ${lab(Pd - 14, W / 2, 'Economic left', -90)}${lab(W - Pd + 14, W / 2, 'Economic right', 90)}
    ${rect}
    <circle id="${opts.id || ''}" cx="${opts.animate ? X(0) : X(e)}" cy="${opts.animate ? Y(0) : Y(so)}" r="8" fill="${c.accent}" stroke="${c.card}" stroke-width="3" data-x="${X(e)}" data-y="${Y(so)}" style="transition:cx 1.2s cubic-bezier(.28,.11,.32,1), cy 1.2s cubic-bezier(.28,.11,.32,1)"/>
  </svg>`;
}
