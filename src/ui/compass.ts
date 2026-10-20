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
}
export const CSS_COLORS: CompassColors = {
  surface: 'var(--surface)',
  line: 'var(--line)',
  muted: 'var(--muted)',
  ink: 'var(--ink)',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  fData: 'var(--f-data)',
  fDisplay: 'var(--f-display)',
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

/** x = economic score, y = social score (traditional up); optional dashed band box. */
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
      ? `<rect x="${X(ce[0])}" y="${Y(cs[1])}" width="${X(ce[1]) - X(ce[0])}" height="${Y(cs[0]) - Y(cs[1])}" rx="6" fill="${c.accentSoft}" stroke="${c.accent}" stroke-width="1" stroke-dasharray="3 3"/>`
      : '';
  const grid = [-50, 50]
    .map(
      (v) =>
        `<line x1="${X(v)}" y1="${Pd}" x2="${X(v)}" y2="${W - Pd}" stroke="${c.line}"/><line x1="${Pd}" y1="${Y(v)}" x2="${W - Pd}" y2="${Y(v)}" stroke="${c.line}"/>`,
    )
    .join('');
  const q = (x: number, y: number, t: string, a: string) =>
    `<text x="${x}" y="${y}" text-anchor="${a}" font-family="${c.fData}" font-size="9" letter-spacing=".06em" fill="${c.muted}">${t}</text>`;
  const lab = (x: number, y: number, t: string, rot?: number) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-size="11" fill="${c.ink}" font-family="${c.fDisplay}"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${t}</text>`;
  return `<svg viewBox="0 0 ${W} ${W}" role="img" aria-label="Two-axis plot of economic and social scores" xmlns="http://www.w3.org/2000/svg">
    <rect x="${Pd}" y="${Pd}" width="${inner}" height="${inner}" fill="${c.surface}" stroke="${c.line}"/>
    ${grid}
    <line x1="${X(0)}" y1="${Pd}" x2="${X(0)}" y2="${W - Pd}" stroke="${c.muted}" opacity=".7"/>
    <line x1="${Pd}" y1="${Y(0)}" x2="${W - Pd}" y2="${Y(0)}" stroke="${c.muted}" opacity=".7"/>
    ${q(Pd + 8, Pd + 16, 'COMMUNITARIAN', 'start')}${q(W - Pd - 8, Pd + 16, 'CONSERVATIVE', 'end')}
    ${q(Pd + 8, W - Pd - 10, 'LEFT-PROGRESSIVE', 'start')}${q(W - Pd - 8, W - Pd - 10, 'LIBERTARIAN-LEANING', 'end')}
    ${lab(W / 2, Pd - 14, 'Socially traditional')}${lab(W / 2, W - Pd + 24, 'Socially progressive')}
    ${lab(Pd - 12, W / 2, 'Economic left', -90)}${lab(W - Pd + 16, W / 2, 'Economic right', 90)}
    ${rect}
    <circle id="${opts.id || ''}" cx="${opts.animate ? X(0) : X(e)}" cy="${opts.animate ? Y(0) : Y(so)}" r="7" fill="${c.accent}" stroke="${c.surface}" stroke-width="3" data-x="${X(e)}" data-y="${Y(so)}" style="transition:cx .9s cubic-bezier(.2,.7,.2,1), cy .9s cubic-bezier(.2,.7,.2,1)"/>
  </svg>`;
}
