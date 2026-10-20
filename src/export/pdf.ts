/* Multi-page PDF report via jsPDF, with the compass as vector graphics through svg2pdf.js.
   Uses the PDF standard fonts (Helvetica, Times, Courier) in the light palette. Loaded lazily. */
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { BENCHMARK_ITEMS, SPEC } from '../benchmark/spec';
import {
  ATTN,
  CORE,
  DIMS,
  FOUNDATIONS,
  INFREQ,
  ITEMS,
  MF_NAMES,
  SELF_OPTS,
  SHORT,
  type ScaleDim,
} from '../instrument/items';
import { axisWord } from '../scoring/labels';
import { CHECK_ORDER } from '../scoring/quality';
import type { Results } from '../scoring/results';
import type { RunState } from '../state/storage';
import { compassSVG, type CompassColors } from '../ui/compass';
import { answerLabel, poleName } from '../ui/labels';
import { DISCLAIMER, LIGHT, SITE, TITLE, signed } from './common';
import { pdfText } from './pdftext';

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const PDF_COMPASS: CompassColors = {
  surface: LIGHT.bg,
  line: LIGHT.line,
  muted: LIGHT.muted,
  ink: LIGHT.ink,
  accent: LIGHT.accent,
  accentSoft: LIGHT.accentSoft,
  fData: 'helvetica',
  fDisplay: 'helvetica',
  card: '#FFFFFF',
  labelWeight: 'bold',
};

export interface PdfMeta {
  version: string;
  completedOn: string;
}

export async function pdfBlob(S: RunState, R: Results, meta: PdfMeta): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({ title: `${TITLE} results`, subject: R.verdict.title, creator: SITE });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M = 48;
  const CW = PW - 2 * M;
  let y = M;

  const color = (h: string) => doc.setTextColor(...hex(h));
  const font = (f: 'helvetica' | 'times' | 'courier', style: 'normal' | 'bold' = 'normal', size = 10) => {
    doc.setFont(f, style);
    doc.setFontSize(size);
  };
  const ensure = (h: number) => {
    if (y + h > PH - M - 24) {
      doc.addPage();
      y = M;
    }
  };
  const para = (
    t: string,
    f: 'helvetica' | 'times' | 'courier' = 'times',
    size = 10.5,
    c: string = LIGHT.ink,
    lh = 1.4,
  ) => {
    font(f, 'normal', size);
    color(c);
    const lines = doc.splitTextToSize(pdfText(t), CW) as string[];
    for (const line of lines) {
      ensure(size * lh);
      doc.text(line, M, y + size);
      y += size * lh;
    }
  };
  const heading = (t: string, size = 14) => {
    ensure(size * 2.4);
    y += size * 0.6;
    font('helvetica', 'bold', size);
    color(LIGHT.ink);
    doc.text(pdfText(t), M, y + size);
    y += size * 1.6;
  };
  const eyebrow = (t: string) => {
    font('courier', 'normal', 8);
    color(LIGHT.muted);
    doc.text(pdfText(t.toUpperCase()), M, y + 8);
    y += 16;
  };
  const track = (dim: ScaleDim, x: number, w: number) => {
    const r = R.sc[dim];
    font('helvetica', 'bold', 10);
    color(LIGHT.ink);
    doc.text(pdfText(DIMS[dim].name), x, y + 10);
    font('courier', 'normal', 10);
    doc.text(r.ok ? `${signed(r.score)} +/- ${Math.round(r.half)}` : 'too few answers', x + w, y + 10, {
      align: 'right',
    });
    const ty = y + 22;
    doc.setDrawColor(...hex(LIGHT.line));
    doc.setLineWidth(1);
    doc.line(x, ty, x + w, ty);
    doc.setDrawColor(...hex(LIGHT.muted));
    doc.line(x + w / 2, ty - 5, x + w / 2, ty + 5);
    if (r.ok) {
      const px = (v: number) => x + ((v + 100) / 200) * w;
      doc.setFillColor(...hex(LIGHT.accentSoft));
      doc.setDrawColor(...hex(LIGHT.accent));
      doc.setLineWidth(0.6);
      doc.roundedRect(px(r.lo), ty - 4, px(r.hi) - px(r.lo), 8, 3, 3, 'FD');
      doc.setFillColor(...hex(LIGHT.accent));
      doc.circle(px(r.score), ty, 4, 'F');
    }
    font('helvetica', 'normal', 7.5);
    color(LIGHT.muted);
    doc.text(pdfText(DIMS[dim].neg), x, ty + 14);
    doc.text(pdfText(DIMS[dim].pos), x + w, ty + 14, { align: 'right' });
    if (r.ok)
      doc.text(pdfText(`Reads as ${axisWord(dim, r.score)} · ${r.n} of ${r.total} answered`), x, ty + 24);
    y += 58;
  };

  // ---- Page 1: result, compass, core and short scales ----
  eyebrow(`${TITLE} · your result · ${meta.completedOn}`);
  font('helvetica', 'bold', 24);
  color(LIGHT.ink);
  for (const line of doc.splitTextToSize(pdfText(R.verdict.title), CW) as string[]) {
    doc.text(line, M, y + 24);
    y += 28;
  }
  y += 4;
  para(R.verdict.body, 'times', 12);
  y += 4;
  font('courier', 'normal', 9);
  color(LIGHT.muted);
  doc.text(pdfText(`Data quality: ${R.q.grade.t}   ·   Instrument ${meta.version}`), M, y + 9);
  y += 22;

  const top = y;
  const size = 250;
  if (R.placed) {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:360px';
    const e = R.sc.econ;
    const so = R.sc.social;
    if (e.ok && so.ok)
      holder.innerHTML = compassSVG(e.score, so.score, [e.lo, e.hi], [so.lo, so.hi], { colors: PDF_COMPASS });
    document.body.appendChild(holder);
    try {
      const svg = holder.querySelector('svg');
      if (svg) await svg2pdf(svg, doc, { x: M - 10, y: top, width: size, height: size });
    } finally {
      holder.remove();
    }
  }
  y = top + 8;
  const ax = M + size + 16;
  const aw = PW - M - ax;
  for (const d of CORE) {
    const save = y;
    track(d, ax, aw);
    y = save + 70;
  }
  y = Math.max(y, top + size) + 6;
  font('times', 'normal', 9);
  color(LIGHT.muted);
  para(
    'Scores run from -100 to +100. 0 is the middle of the scale, not the average person. The band shows how much your answers varied from topic to topic within each scale; it does not predict a retest.',
    'times',
    9,
    LIGHT.muted,
  );
  heading('Short scales (4 statements each, indicative only)', 12);
  const half = (CW - 24) / 2;
  let rowY = y;
  SHORT.forEach((d, i) => {
    const col = i % 2;
    if (col === 0) rowY = y;
    y = rowY;
    track(d, M + col * (half + 24), half);
  });

  // ---- Page 2: moral foundations, label vs positions, quality ----
  doc.addPage();
  y = M;
  heading('Moral foundations');
  para(
    'Each foundation compared with your own average across all 18 statements, so a general habit of agreeing cancels out. Raw 1-5 average in brackets.',
    'times',
    9.5,
    LIGHT.muted,
  );
  y += 6;
  const bx = M + 110;
  const bw = CW - 110 - 80;
  for (const f of FOUNDATIONS) {
    const x = R.mf.f[f];
    font('helvetica', 'normal', 10);
    color(LIGHT.ink);
    doc.text(MF_NAMES[f], M, y + 10);
    doc.setDrawColor(...hex(LIGHT.line));
    doc.line(bx, y + 6, bx + bw, y + 6);
    doc.setDrawColor(...hex(LIGHT.muted));
    doc.line(bx + bw / 2, y, bx + bw / 2, y + 12);
    if (x) {
      const rel = Math.max(-1.5, Math.min(1.5, x.rel));
      const w = (Math.abs(rel) / 1.5) * (bw / 2);
      const l = rel < 0 ? bx + bw / 2 - w : bx + bw / 2;
      doc.setFillColor(...hex(f === 'care' || f === 'equality' ? LIGHT.accent : LIGHT.ink));
      const bwid = Math.max(w, 1);
      const rr = Math.min(2, bwid / 2);
      doc.roundedRect(l, y + 1, bwid, 10, rr, rr, 'F');
      font('courier', 'normal', 9.5);
      doc.text(`${x.rel >= 0 ? '+' : ''}${x.rel.toFixed(2)} (${x.raw.toFixed(1)})`, PW - M, y + 10, {
        align: 'right',
      });
    } else {
      font('courier', 'normal', 9.5);
      doc.text('-', PW - M, y + 10, { align: 'right' });
    }
    y += 20;
  }
  font('courier', 'normal', 8);
  color(LIGHT.muted);
  doc.text('-1.5', bx, y + 4);
  doc.text('your average', bx + bw / 2, y + 4, { align: 'center' });
  doc.text('+1.5', bx + bw, y + 4, { align: 'right' });
  y += 16;
  if (R.mfRead) para(R.mfRead.text, 'times', 10.5);

  heading('Label vs. positions');
  para(`Self-placement: ${S.answers.SP ? SELF_OPTS[S.answers.SP - 1] : 'not recorded'}.`, 'helvetica', 10);
  if (R.self) para(R.self.text, 'times', 10.5);

  heading(`How much to trust this: ${R.q.grade.t}`);
  for (const k of CHECK_ORDER) {
    const c = R.q.r[k];
    ensure(40);
    const dot = { good: LIGHT.good, warn: LIGHT.warn, bad: LIGHT.bad }[c.state];
    doc.setFillColor(...hex(dot));
    doc.circle(M + 4, y + 7, 3.5, 'F');
    font('helvetica', 'bold', 10);
    color(LIGHT.ink);
    doc.text(pdfText(c.label), M + 14, y + 10);
    font('courier', 'normal', 10);
    doc.text(pdfText(c.value), PW - M, y + 10, { align: 'right' });
    y += 14;
    font('times', 'normal', 9);
    color(LIGHT.muted);
    for (const line of doc.splitTextToSize(pdfText(c.note), CW - 14) as string[]) {
      ensure(12);
      doc.text(line, M + 14, y + 9);
      y += 11.5;
    }
    y += 6;
  }

  // ---- Item table ----
  doc.addPage();
  y = M;
  heading('Your answers, statement by statement');
  para(
    'Items ending in a and b are the two sides of one pair. Shaded rows are pairs where you agreed with both sides or disagreed with both.',
    'times',
    9,
    LIGHT.muted,
  );
  y += 4;
  const cols = [M, M + 32, M + 310, M + 418];
  const widths = [28, 268, 100, CW - 418 + 4];
  const header = () => {
    font('courier', 'normal', 7.5);
    color(LIGHT.muted);
    ['ITEM', 'STATEMENT', 'YOUR ANSWER', 'AGREE POINTS TO'].forEach((h, i) => doc.text(h, cols[i], y + 8));
    y += 14;
  };
  header();
  for (const it of [...ITEMS, ATTN, INFREQ]) {
    font('helvetica', 'normal', 8.5);
    const lines = doc.splitTextToSize(pdfText(it.text), widths[1]) as string[];
    const ans = doc.splitTextToSize(pdfText(answerLabel(S.answers[it.id])), widths[2]) as string[];
    const pole = doc.splitTextToSize(pdfText(poleName(it)), widths[3]) as string[];
    const h = Math.max(lines.length, ans.length, pole.length) * 10.5 + 6;
    if (y + h > PH - M - 24) {
      doc.addPage();
      y = M;
      header();
    }
    if ('pair' in it && R.contraPairs.has(it.pair)) {
      doc.setFillColor(...hex(LIGHT.accentSoft));
      doc.rect(M - 4, y - 2, CW + 8, h, 'F');
    }
    color(LIGHT.ink);
    font('courier', 'normal', 8.5);
    doc.text(it.id, cols[0], y + 8);
    font('helvetica', 'normal', 8.5);
    doc.text(lines, cols[1], y + 8, { lineHeightFactor: 1.25 });
    doc.text(ans, cols[2], y + 8, { lineHeightFactor: 1.25 });
    color(LIGHT.muted);
    doc.text(pole, cols[3], y + 8, { lineHeightFactor: 1.25 });
    doc.setDrawColor(...hex(LIGHT.line));
    doc.line(M - 4, y + h - 2, PW - M + 4, y + h - 2);
    y += h;
  }

  if (S.benchmark?.done) {
    heading('U.S. benchmark answers');
    para(
      `Asked in the original wording of ${Object.values(SPEC.sources)
        .map((s) => s.short)
        .join(' and ')}.`,
      'times',
      9.5,
      LIGHT.muted,
    );
    for (const it of BENCHMARK_ITEMS) {
      const v = S.benchmark.answers[it.id];
      const o = [...it.options, ...it.offeredNonSubstantive].find((x) => x.code === v);
      para(
        `${it.variable}: ${it.question} - ${v === undefined || v < 0 ? 'skipped' : o?.label ? `${v} (${o.label})` : String(v)}`,
        'helvetica',
        8.5,
      );
    }
  }

  // ---- Method and limitations ----
  heading('Method and limitations');
  [
    'Structure. Economic and social ideology are measured separately because they are the minimum two dimensions needed to account for policy preferences (Feldman & Johnston, 2014); a third scale covers state authority versus civil liberty. Short scales for climate, trade and populism are indicative only.',
    'Item design. Every statement asks for a value or preference, makes a single claim and names no party or politician. Ideology statements come in matched pairs on the same topic with equal strength in both directions, shown at least eight items apart, so a habit of agreeing cancels out.',
    'Scoring. A scale score is your average keyed answer times 50. No opinion is scored as missing. Word labels use provisional cutoffs (under 15 centrist, 15-40 leaning, 40-70 moderately, 70+ strongly) set from what the answers mean, not from population data.',
    'Moral foundations follow the six MFQ-2 constructs (Atari et al., 2023) with original wording, scored relative to your own average.',
    'Limits. The items have not yet been field-tested. Scores show your position relative to the scale midpoint, not a percentile among the public, and the band reflects variation across topics rather than test-retest reliability. Issue salience differs by country.',
  ].forEach((t) => {
    para(t, 'times', 10);
    y += 4;
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    font('courier', 'normal', 7);
    color(LIGHT.muted);
    doc.text(pdfText(DISCLAIMER), M, PH - M + 12);
    doc.text(`${SITE} · v${meta.version} · ${meta.completedOn}`, M, PH - M + 22);
    doc.text(`${p} / ${pages}`, PW - M, PH - M + 22, { align: 'right' });
  }
  return doc.output('blob');
}
