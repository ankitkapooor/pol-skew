/* PNG share card drawn to canvas for fidelity: verdict, compass, three core scores, quality grade,
   instrument version and the disclaimer. Always uses the light palette. */
import { CORE, DIMS } from '../instrument/items';
import type { Results } from '../scoring/results';
import { COMPASS } from '../ui/compass';
import { DISCLAIMER, LIGHT, SITE, TITLE, signed } from './common';

export type CardFormat = 'portrait' | 'square';
export const CARD_SIZES: Record<CardFormat, { w: number; h: number }> = {
  portrait: { w: 1200, h: 1500 },
  square: { w: 1080, h: 1080 },
};

const F = {
  display: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  read: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  data: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};

/** Make sure the web fonts are loaded before drawing, or canvas falls back to system fonts. */
export async function ensureFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all(
    [
      `600 64px ${F.display}`,
      `500 32px ${F.display}`,
      `400 32px ${F.display}`,
      `400 32px ${F.read}`,
      `400 24px ${F.data}`,
      `500 24px ${F.data}`,
    ].map((f) => document.fonts.load(f).catch(() => [])),
  );
  await document.fonts.ready;
}

type Ctx = CanvasRenderingContext2D;

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function spaced(ctx: Ctx, px: number): void {
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${px}px`;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the compass at (x, y) with side `size`, matching ui/compass.ts geometry. */
function drawCompass(ctx: Ctx, R: Results, x: number, y: number, size: number): void {
  const e = R.sc.econ;
  const so = R.sc.social;
  const k = size / COMPASS.size;
  const Pd = COMPASS.pad * k;
  const inner = size - 2 * Pd;
  const X = (v: number) => x + Pd + ((v + 100) / 200) * inner;
  const Y = (v: number) => y + Pd + ((100 - v) / 200) * inner;
  ctx.save();
  ctx.fillStyle = LIGHT.bg;
  roundRect(ctx, x + Pd, y + Pd, inner, inner, 14 * k);
  ctx.fill();
  ctx.strokeStyle = LIGHT.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(X(0), y + Pd + 8 * k);
  ctx.lineTo(X(0), y + size - Pd - 8 * k);
  ctx.moveTo(x + Pd + 8 * k, Y(0));
  ctx.lineTo(x + size - Pd - 8 * k, Y(0));
  ctx.stroke();
  ctx.fillStyle = LIGHT.muted;
  ctx.font = `600 ${9 * k}px ${F.display}`;
  spaced(ctx, 0.4 * k);
  ctx.textAlign = 'left';
  ctx.fillText('COMMUNITARIAN', x + Pd + 14 * k, y + Pd + 22 * k);
  ctx.fillText('LEFT-PROGRESSIVE', x + Pd + 14 * k, y + size - Pd - 14 * k);
  ctx.textAlign = 'right';
  ctx.fillText('CONSERVATIVE', x + size - Pd - 14 * k, y + Pd + 22 * k);
  ctx.fillText('LIBERTARIAN-LEANING', x + size - Pd - 14 * k, y + size - Pd - 14 * k);
  spaced(ctx, 0);
  ctx.font = `400 ${11 * k}px ${F.display}`;
  ctx.textAlign = 'center';
  ctx.fillText('Socially traditional', x + size / 2, y + Pd - 14 * k);
  ctx.fillText('Socially progressive', x + size / 2, y + size - Pd + 24 * k);
  const vlab = (t: string, cx: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, y + size / 2);
    ctx.rotate(rot);
    ctx.fillText(t, 0, 0);
    ctx.restore();
  };
  vlab('Economic left', x + Pd - 12 * k, -Math.PI / 2);
  vlab('Economic right', x + size - Pd + 16 * k, Math.PI / 2);
  if (e.ok && so.ok) {
    ctx.fillStyle = LIGHT.accentSoft;
    roundRect(ctx, X(e.lo), Y(so.hi), X(e.hi) - X(e.lo), Y(so.lo) - Y(so.hi), 8 * k);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(X(e.score), Y(so.score), 8 * k, 0, Math.PI * 2);
    ctx.fillStyle = LIGHT.accent;
    ctx.fill();
    ctx.lineWidth = 3 * k;
    ctx.strokeStyle = LIGHT.surface;
    ctx.stroke();
  }
  ctx.restore();
}

/** One score row: name, value ± band, track with band and point. Returns the height used. */
function drawAxis(
  ctx: Ctx,
  R: Results,
  d: (typeof CORE)[number],
  x: number,
  y: number,
  w: number,
  s: number,
): number {
  const r = R.sc[d];
  ctx.textAlign = 'left';
  ctx.fillStyle = LIGHT.ink;
  ctx.font = `600 ${30 * s}px ${F.display}`;
  ctx.fillText(DIMS[d].name, x, y + 30 * s);
  ctx.textAlign = 'right';
  ctx.font = `500 ${30 * s}px ${F.data}`;
  ctx.fillText(r.ok ? `${signed(r.score)} ± ${Math.round(r.half)}` : '—', x + w, y + 30 * s);
  const ty = y + 58 * s;
  ctx.fillStyle = LIGHT.bg;
  roundRect(ctx, x, ty - 3 * s, w, 9 * s, 4.5 * s);
  ctx.fill();
  ctx.fillStyle = LIGHT.line;
  ctx.fillRect(x + w / 2 - 1, ty - 12 * s, 2, 27 * s);
  if (r.ok) {
    const px = (v: number) => x + ((v + 100) / 200) * w;
    ctx.fillStyle = LIGHT.accentSoft;
    roundRect(ctx, px(r.lo), ty - 8 * s, px(r.hi) - px(r.lo), 19 * s, 9 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px(r.score), ty + 1.5 * s, 12 * s, 0, Math.PI * 2);
    ctx.fillStyle = LIGHT.accent;
    ctx.fill();
    ctx.lineWidth = 4 * s;
    ctx.strokeStyle = LIGHT.surface;
    ctx.stroke();
  }
  ctx.fillStyle = LIGHT.muted;
  ctx.font = `400 ${19 * s}px ${F.display}`;
  ctx.textAlign = 'left';
  ctx.fillText(DIMS[d].negW, x, ty + 40 * s);
  ctx.textAlign = 'right';
  ctx.fillText(DIMS[d].posW, x + w, ty + 40 * s);
  return 120 * s;
}

export interface CardMeta {
  version: string;
  completedOn: string;
}

export function drawCard(ctx: Ctx, fmt: CardFormat, R: Results, meta: CardMeta): void {
  const { w: W, h: H } = CARD_SIZES[fmt];
  const square = fmt === 'square';
  const M = square ? 56 : 64;
  ctx.fillStyle = LIGHT.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = LIGHT.surface;
  ctx.strokeStyle = LIGHT.line;
  ctx.lineWidth = 2;
  roundRect(ctx, M / 2, M / 2, W - M, H - M, 28);
  ctx.fill();
  ctx.stroke();

  const x = M + 24;
  const cw = W - 2 * x;
  let y = M + 48;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = LIGHT.muted;
  ctx.font = `500 22px ${F.data}`;
  spaced(ctx, 2.5);
  ctx.textAlign = 'left';
  ctx.fillText(`${TITLE.toUpperCase()} · RESULT`, x, y);
  spaced(ctx, 0);

  // Verdict title
  y += square ? 64 : 80;
  ctx.fillStyle = LIGHT.ink;
  ctx.font = `600 ${square ? 58 : 72}px ${F.display}`;
  for (const line of wrap(ctx, R.verdict.title, cw)) {
    ctx.fillText(line, x, y);
    y += square ? 64 : 80;
  }

  // Chips: quality and date
  const chip = (label: string, color: string, cx: number, cy: number): number => {
    ctx.font = `400 22px ${F.data}`;
    const tw = ctx.measureText(label).width;
    const wch = tw + 62;
    ctx.fillStyle = LIGHT.bg;
    ctx.strokeStyle = LIGHT.line;
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx, cy - 30, wch, 44, 22);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 24, cy - 8, 7, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = LIGHT.ink;
    ctx.fillText(label, cx + 42, cy);
    return wch;
  };
  const gradeColor = { good: LIGHT.good, warn: LIGHT.warn, bad: LIGHT.bad }[R.q.grade.s];
  y += square ? 0 : 6;
  const cw1 = chip(`Data quality: ${R.q.grade.t}`, gradeColor, x, y);
  chip(meta.completedOn, LIGHT.muted, x + cw1 + 12, y);
  y += 44;

  // Footer position first, so the compass can take whatever space is left.
  const fy = H - M - (square ? 96 : 110);
  if (square) {
    const size = Math.min(520, fy - y - 24, cw * 0.56);
    drawCompass(ctx, R, x - 18, y + 8, size);
    const ax = x + size + 10;
    const aw = W - ax - x + 6;
    const s = 0.82;
    let ay = y + 8 + (size - 3 * 120 * s) / 2;
    for (const d of CORE) ay += drawAxis(ctx, R, d, ax, ay, aw, s);
  } else {
    const axesH = 3 * 114;
    const size = Math.min(700, fy - 28 - axesH - y - 16);
    drawCompass(ctx, R, (W - size) / 2, y + 8, size);
    y += size + 24;
    for (const d of CORE) y += drawAxis(ctx, R, d, x, y, cw, 1) - 6;
  }

  // Footer: version, disclaimer, site
  ctx.strokeStyle = LIGHT.line;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, fy);
  ctx.lineTo(x + cw, fy);
  ctx.stroke();
  ctx.fillStyle = LIGHT.muted;
  ctx.font = `400 ${square ? 20 : 22}px ${F.data}`;
  ctx.textAlign = 'left';
  let ly = fy + 36;
  for (const line of wrap(ctx, DISCLAIMER + ' Cutoffs are provisional.', cw)) {
    ctx.fillText(line, x, ly);
    ly += square ? 28 : 30;
  }
  ctx.fillStyle = LIGHT.ink;
  ctx.fillText(SITE, x, ly + 4);
  ctx.textAlign = 'right';
  ctx.fillStyle = LIGHT.muted;
  ctx.fillText(`v${meta.version}`, x + cw, ly + 4);
}

export async function cardBlob(fmt: CardFormat, R: Results, meta: CardMeta): Promise<Blob> {
  await ensureFonts();
  const { w, h } = CARD_SIZES[fmt];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  drawCard(ctx, fmt, R, meta);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
  );
}
