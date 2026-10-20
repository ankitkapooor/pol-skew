import {
  ATTN,
  CORE,
  DIMS,
  FOUNDATIONS,
  INFREQ,
  ITEMS,
  LIKERT,
  MF_NAMES,
  SHORT,
  isMF,
  isSpecial,
  type AnyItem,
  type ScaleDim,
} from '../instrument/items';
import { axisWord } from '../scoring/labels';
import { CHECK_ORDER } from '../scoring/quality';
import { computeResults, type Results } from '../scoring/results';
import type { ScaleResult } from '../scoring/scale';
import type { RunState } from '../state/storage';
import { shortSummary } from '../export/text';
import { compassSVG } from './compass';
import { $, app, copyText, esc, sgn } from './dom';
import { mountExtras } from './extras';

export interface ResultsHandlers {
  retake: () => void;
  openBenchmark: () => void;
}

export function axisBlock(dim: ScaleDim, r: ScaleResult, short?: boolean): string {
  const d = DIMS[dim];
  if (!r.ok)
    return `<div class="axis"><div class="axis-top"><h3>${d.name}</h3><span class="mono small muted">too few answers</span></div></div>`;
  const pct = (v: number) => (v + 100) / 2;
  return `<div class="axis">
    <div class="axis-top"><h3>${d.name}</h3><span class="mono small">${sgn(r.score)} <span class="muted">± ${Math.round(r.half)}</span></span></div>
    <div class="track"><div class="rail"></div><div class="mid"></div>
      <div class="ci" data-l="${pct(r.lo)}" data-w="${pct(r.hi) - pct(r.lo)}" style="left:50%;width:0"></div>
      <div class="pt" data-l="${pct(r.score)}" style="left:50%"></div></div>
    <div class="poles"><span>${d.neg}</span><span>${d.pos}</span></div>
    <p class="small muted">Reads as <b style="color:var(--ink);font-weight:600">${axisWord(dim, r.score)}</b> · ${r.n} of ${r.total} answered${short ? '' : ` · same direction on ${Math.round(r.consistency * 100)}% of the weight`}</p>
  </div>`;
}

export const answerLabel = (a: number | undefined): string =>
  a === undefined ? '—' : a === 0 ? 'No opinion' : LIKERT[a - 1];

/** What agreeing with an item points to: a pole word, a foundation, or "Check". */
export const poleName = (it: AnyItem): string =>
  isSpecial(it) ? 'Check' : isMF(it) ? MF_NAMES[it.f] : it.dir > 0 ? DIMS[it.dim].posW : DIMS[it.dim].negW;

function mfRows(R: Results): string {
  return FOUNDATIONS.map((f) => {
    const x = R.mf.f[f];
    const ind = f === 'care' || f === 'equality';
    if (!x)
      return `<span class="small">${MF_NAMES[f]}</span><div class="bar"></div><span class="mono small" style="text-align:right">—</span>`;
    const rel = Math.max(-1.5, Math.min(1.5, x.rel));
    const w = (Math.abs(rel) / 1.5) * 50;
    const l = rel < 0 ? 50 - w : 50;
    return `<span class="small">${MF_NAMES[f]}</span><div class="bar ${ind ? 'ind' : ''}"><i data-l="${l}" data-w="${w}" style="left:50%;width:0"></i></div><span class="mono small" style="text-align:right">${x.rel >= 0 ? '+' : ''}${x.rel.toFixed(2)} <span class="muted">(${x.raw.toFixed(1)})</span></span>`;
  }).join('');
}

export function renderResults(S: RunState, animate: boolean, h: ResultsHandlers): void {
  const A = S.answers;
  const R = computeResults(A, S.times, S.words || {});
  const { sc, q, verdict: v } = R;
  const e = sc.econ;
  const so = sc.social;
  const dRows = CHECK_ORDER.map((k) => {
    const r = q.r[k];
    return `<dt>${r.label}</dt><dd><span class="chip ${r.state}"><span class="dot"></span>${esc(r.value)}</span></dd><p class="note">${r.note}</p>`;
  }).join('');
  const itemRows = [...ITEMS, ATTN, INFREQ]
    .map((it) => {
      const pair = 'pair' in it ? it.pair : '';
      return `<tr class="${R.contraPairs.has(pair) ? 'contra' : ''}"><td class="num">${it.id}</td><td>${esc(it.text)}</td><td>${answerLabel(A[it.id])}</td><td class="small muted">${poleName(it)}</td></tr>`;
    })
    .join('');
  const ce: [number, number] | null = e.ok ? [e.lo, e.hi] : null;
  const cs: [number, number] | null = so.ok ? [so.lo, so.hi] : null;

  app().innerHTML = `
  <header class="verdict fade">
    <span class="eyebrow">Your result</span>
    <h1>${esc(v.title)}</h1>
    <p class="lede">${v.body}</p>
    <div class="chips">
      <span class="chip ${q.grade.s}"><span class="dot"></span>Data quality: ${q.grade.t}</span>
      ${CORE.map((d) => {
        const r = sc[d];
        return r.ok
          ? `<span class="chip acc"><span class="dot"></span>${DIMS[d].name} ${sgn(r.score)}</span>`
          : '';
      }).join('')}
    </div>
  </header>

  <section class="res-grid fade">
    <div class="panel compass">${e.ok && so.ok ? compassSVG(e.score, so.score, ce, cs, { id: 'pt', animate: !!animate }) : '<p class="muted">Plot unavailable.</p>'}
      <p class="small muted" style="margin-top:10px">Scores run from −100 to +100. 0 is the middle of the scale, not the average person. The dashed box shows how much your answers varied from topic to topic within each scale (a wider box means your views differ by topic, or some answers were noisy). It does not predict a retest.</p>
    </div>
    <div class="panel axes">${CORE.map((d) => axisBlock(d, sc[d])).join('')}</div>
  </section>

  <section class="panel stack fade">
    <div class="axis-top"><h2>Short scales</h2><span class="small muted">4 statements each, indicative only</span></div>
    <p class="small muted">These cut across left and right rather than lining up with them, so they aren't part of the plot above.</p>
    <div class="res-grid" style="gap:20px 28px">${SHORT.map((d) => axisBlock(d, sc[d], true)).join('')}</div>
  </section>

  <section class="res-grid fade">
    <div class="panel stack">
      <h2>Moral foundations</h2>
      <p class="small muted">Each foundation compared with your own average across all 18 statements, so a general habit of agreeing cancels out. Raw 1–5 average in brackets.</p>
      <div class="mf">${mfRows(R)}</div>
      <div class="mf-scale"><span>−1.5</span><span>your average</span><span>+1.5</span></div>
      <p class="small">${R.mfRead?.html ?? ''}</p>
    </div>
    <div class="panel stack">
      <h2>Label vs. positions</h2>
      <p class="small">${R.self?.html || 'No self-placement recorded.'}</p>
      <h2 style="margin-top:8px">How much to trust this</h2>
      <dl class="diag">${dRows}</dl>
    </div>
  </section>

  <section class="stack fade">
    <div class="row no-print">
      <button class="btn" id="copy">Copy summary</button>
      <button class="btn ghost" id="retake">Retake</button>
    </div>
    <div id="extras" class="stack" style="gap:28px"></div>
    <details><summary>Your answers, statement by statement</summary>
      <div class="tablewrap"><table><thead><tr><th>Item</th><th>Statement</th><th>Your answer</th><th>Agree points to</th></tr></thead><tbody>${itemRows}</tbody></table></div>
      <p class="small muted" style="margin-top:8px">Items ending in a and b are the two sides of one pair. Shaded rows are pairs where you agreed with both sides or disagreed with both.</p>
    </details>
    <details><summary>How labels and cutoffs work</summary>
      <div class="prose" style="margin-top:12px">
        <p>A scale score is your average answer toward its + pole, times 50. So +50 means you <i>somewhat agreed</i> with that side on average, and +100 means <i>strongly</i> on every statement. The word labels use provisional cutoffs: under 15 is centrist (within about a third of a step of neutral), 15–40 leaning, 40–70 moderately, 70 and above strongly. These are set from what the answers mean, not from population data, and will change once norms are added.</p>
      </div>
    </details>
    <details><summary>Method and sources</summary>
      <div class="prose" style="margin-top:12px">
        <p><b>Structure.</b> Feldman and Johnston (2014, <i>Political Psychology</i>) showed that economic and social ideology are the minimum two dimensions needed to account for policy preferences, and that only about 45% of a U.S. national sample fit cleanly on one left–right line. Everett's SECS (2013, <i>PLOS ONE</i>) validated separate social and economic subscales on the same logic. The state-authority scale follows the authoritarian–libertarian distinction in Duckitt and Sibley's dual-process model. The populism scale draws on the populist-attitudes construct of Akkerman, Mudde and Zaslove (2014, <i>Comparative Political Studies</i>), with every item balanced by an opposite.</p>
        <p><b>Item design.</b> Every statement asks for a value or preference, not a judgment about facts, and makes a single claim. Ideology statements come in matched pairs on the same topic with equal strength in both directions. Pairs are shown at least eight items apart.</p>
        <p><b>Moral foundations.</b> The six foundations come from the MFQ-2 (Atari et al., 2023, <i>Journal of Personality and Social Psychology</i>), which split fairness into equality and proportionality and found that foundations vary substantially by culture. Items here are original wording for those constructs, three per foundation, scored relative to your own average.</p>
        <p><b>Noise controls.</b> Balanced pairs cancel most yea-saying. <i>No opinion</i> is scored as missing, not neutral. An instructed-response check, an implausible-statement check, contradictory-pair counts, response variety and a reading-speed check flag low-quality runs. Self-placement is asked last so the label can't anchor your answers.</p>
        <p><b>Limits.</b> The items have not yet been field-tested, so scores show your position relative to the scale midpoint, not a percentile among the public, and the band reflects variation across topics rather than test–retest reliability. Issue salience differs by country: religion in law, immigration or abortion can carry different weight in India than in the U.S.</p>
        <ul class="small">
          <li><a href="https://scholars.duke.edu/publication/745676" target="_blank" rel="noopener">Feldman &amp; Johnston (2014), Understanding the determinants of political ideology</a></li>
          <li><a href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3859575/" target="_blank" rel="noopener">Everett (2013), The 12 Item Social and Economic Conservatism Scale</a></li>
          <li><a href="https://link.springer.com/article/10.1007/s12144-025-07630-4" target="_blank" rel="noopener">MFQ-2 (Atari et al., 2023) and later validation work</a></li>
          <li><a href="https://research.vu.nl/en/publications/how-populist-are-the-people-measuring-populist-attitudes-in-voter/" target="_blank" rel="noopener">Akkerman, Mudde &amp; Zaslove (2014), How populist are the people?</a></li>
          <li><a href="https://methods.sagepub.com/ency/edvol/embed/encyclopedia-of-survey-research-methods/chpt/acquiescence-response-bias" target="_blank" rel="noopener">Acquiescence response bias, Encyclopedia of Survey Research Methods</a></li>
        </ul>
      </div>
    </details>
  </section>`;

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      app()
        .querySelectorAll<HTMLElement>('.track .ci')
        .forEach((el) => {
          el.style.left = el.dataset.l + '%';
          el.style.width = el.dataset.w + '%';
        });
      app()
        .querySelectorAll<HTMLElement>('.track .pt')
        .forEach((el) => {
          el.style.left = el.dataset.l + '%';
        });
      app()
        .querySelectorAll<HTMLElement>('.mf .bar i')
        .forEach((el) => {
          el.style.left = el.dataset.l + '%';
          el.style.width = el.dataset.w + '%';
        });
      const pt = $('pt');
      if (pt) {
        pt.setAttribute('cx', pt.dataset.x!);
        pt.setAttribute('cy', pt.dataset.y!);
      }
    }),
  );

  $('copy')!.onclick = () => copyText(shortSummary(R));
  $('retake')!.onclick = h.retake;
  window.scrollTo(0, 0);
  mountExtras($('extras')!, S, R, h);
}
