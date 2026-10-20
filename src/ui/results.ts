import {
  ATTN,
  CORE,
  DIMS,
  FOUNDATIONS,
  INFREQ,
  ITEMS,
  MF_NAMES,
  SHORT,
  type ScaleDim,
} from '../instrument/items';
import { axisWord, selfValue } from '../scoring/labels';
import { CHECK_ORDER } from '../scoring/quality';
import { computeResults, type Results } from '../scoring/results';
import type { ScaleResult, ScaleScore } from '../scoring/scale';
import type { RunState } from '../state/storage';
import { shortSummary } from '../export/text';
import { statusIcon, tile, topBar, footer, wireBrand } from './chrome';
import { compassSVG } from './compass';
import { $, app, copyText, esc, prefersReducedMotion, sgn } from './dom';
import { mountExtras } from './extras';
import { answerLabel, poleName } from './labels';

export interface ResultsHandlers {
  retake: () => void;
  openBenchmark: () => void;
  home: () => void;
}

const pct = (v: number) => (v + 100) / 2;

const track = (r: ScaleScore): string => `<div class="track"><div class="rail"></div><div class="mid"></div>
      <div class="ci" data-l="${pct(r.lo)}" data-w="${pct(r.hi) - pct(r.lo)}" style="left:50%;width:0"></div>
      <div class="pt" data-l="${pct(r.score)}" style="left:50%"></div></div>`;

/** Card for one core scale: score, reading, track with band, poles and answer counts. */
export function axisBlock(dim: ScaleDim, r: ScaleResult): string {
  const d = DIMS[dim];
  if (!r.ok)
    return `<article class="panel axis"><h3 class="axis-name">${d.name}</h3><p class="muted">Too few answers to score this scale.</p></article>`;
  return `<article class="panel axis">
    <h3 class="axis-name">${d.name}</h3>
    <p class="axis-score"><span class="big num" data-score="${Math.round(r.score)}">${sgn(r.score)}</span><span class="word">${axisWord(dim, r.score)}</span></p>
    ${track(r)}
    <div class="poles"><span>${d.neg}</span><span>${d.pos}</span></div>
    <p class="small muted">${r.n} of ${r.total} answered · same direction on ${Math.round(r.consistency * 100)}% of the weight · band ±${Math.round(r.half)}</p>
  </article>`;
}

function shortRow(dim: ScaleDim, r: ScaleResult): string {
  const d = DIMS[dim];
  if (!r.ok)
    return `<div class="srow"><h3>${d.name}</h3><p class="small muted">Too few answers.</p><span></span></div>`;
  return `<div class="srow">
    <h3>${d.name}</h3>
    <div class="srow-track">${track(r)}<div class="poles"><span>${d.neg}</span><span>${d.pos}</span></div></div>
    <p class="srow-val"><b class="num">${sgn(r.score)} <span class="muted">± ${Math.round(r.half)}</span></b><span class="muted">${axisWord(dim, r.score)} · ${r.n} of ${r.total} answered</span></p>
  </div>`;
}

function mfRows(R: Results): string {
  return FOUNDATIONS.map((f) => {
    const x = R.mf.f[f];
    const ind = f === 'care' || f === 'equality';
    if (!x) return `<span>${MF_NAMES[f]}</span><div class="bar"></div><span class="num mf-val">—</span>`;
    const rel = Math.max(-1.5, Math.min(1.5, x.rel));
    const w = (Math.abs(rel) / 1.5) * 50;
    const l = rel < 0 ? 50 - w : 50;
    return `<span>${MF_NAMES[f]}</span><div class="bar ${ind ? 'ind' : ''}"><i data-l="${l}" data-w="${w}" style="left:50%;width:0"></i></div><span class="num mf-val">${x.rel >= 0 ? '+' : ''}${x.rel.toFixed(2)} <span class="muted">(${x.raw.toFixed(1)})</span></span>`;
  }).join('');
}

/** Positions a caption over a point without letting it run past either end of the line. */
const capAt = (p: number): string =>
  `left:${p}%;transform:translateX(${p < 12 ? '-8px' : p > 88 ? 'calc(-100% + 8px)' : '-50%'})`;

/** Self-label against the two issue scores on one −100…+100 line (the label is mapped as in selfRead). */
function labelLine(S: RunState, R: Results): string {
  const sp = S.answers.SP;
  const e = R.sc.econ;
  const so = R.sc.social;
  if (!sp || !e.ok || !so.ok || !R.self) return '';
  const pl = pct(selfValue(sp));
  return `<div class="label-line" aria-hidden="true">
      <span class="ll-tag" style="${capAt(pl)}">Your label</span>
      <div class="ll-rail"></div>
      <i class="ll-self" style="left:${pl}%"></i>
      <i class="ll-dot" style="left:${pct(e.score)}%"></i><span class="ll-cap" style="${capAt(pct(e.score))}">Economic ${sgn(e.score)}</span>
      <i class="ll-dot hollow" style="left:${pct(so.score)}%"></i><span class="ll-cap low" style="${capAt(pct(so.score))}">Social ${sgn(so.score)}</span>
    </div>
    <div class="poles"><span>Very left / liberal</span><span>Very right / conservative</span></div>`;
}

/** Animates the large scores from 0 to their values. */
function countUp(): void {
  const els = [...app().querySelectorAll<HTMLElement>('.big[data-score]')];
  const start = performance.now() + 300;
  const step = (now: number) => {
    const t = Math.max(0, Math.min(1, (now - start) / 1200));
    const k = 1 - Math.pow(1 - t, 3);
    for (const el of els) {
      if (!el.isConnected) return;
      el.textContent = sgn(+el.dataset.score! * k);
    }
    if (t < 1) requestAnimationFrame(step);
  };
  for (const el of els) el.textContent = '0';
  requestAnimationFrame(step);
}

/** Highlights the section-nav link for the section in view. */
function trackSections(): void {
  if (!('IntersectionObserver' in window)) return;
  const links = [...app().querySelectorAll<HTMLAnchorElement>('.seg a')];
  const byId = new Map(links.map((a) => [a.getAttribute('href')!.slice(1), a]));
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const a = byId.get(en.target.id);
        if (!a) continue;
        links.forEach((x) => x.classList.toggle('on', x === a));
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  byId.forEach((_, id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });
}

export function renderResults(S: RunState, animate: boolean, h: ResultsHandlers): void {
  const A = S.answers;
  const R = computeResults(A, S.times, S.words || {});
  const { sc, q, verdict: v } = R;
  const e = sc.econ;
  const so = sc.social;
  const dRows = CHECK_ORDER.map((k) => {
    const r = q.r[k];
    return `<div class="qrow">${statusIcon(r.state)}<div><dt>${r.label}</dt><p class="note">${r.note}</p></div><dd class="num">${esc(r.value)}</dd></div>`;
  }).join('');
  const itemRows = [...ITEMS, ATTN, INFREQ]
    .map((it) => {
      const pair = 'pair' in it ? it.pair : '';
      return `<tr class="${R.contraPairs.has(pair) ? 'contra' : ''}"><td class="num">${it.id}</td><td>${esc(it.text)}</td><td>${answerLabel(A[it.id])}</td><td class="muted">${poleName(it)}</td></tr>`;
    })
    .join('');
  const ce: [number, number] | null = e.ok ? [e.lo, e.hi] : null;
  const cs: [number, number] | null = so.ok ? [so.lo, so.hi] : null;
  const motion = animate && !prefersReducedMotion();

  app().innerHTML = `
  <div class="screen alt">
  ${topBar('<a class="pill" href="#exports">Save result</a>')}
  <div class="container results">
    <header class="verdict result-hero">
      <p class="eyebrow up">Your result</p>
      <h1 class="display up" style="--d:.06s">${esc(v.title)}</h1>
      <p class="subhead up" style="--d:.12s">${v.body}</p>
      <div class="hero-actions up" style="--d:.18s">
        <a href="#quality" class="chip ${q.grade.s}"><span class="dot"></span>Data quality: ${q.grade.t}</a>
        <span class="hero-buttons no-print">
          <button class="btn ghost" id="copy">Copy summary</button>
          <button class="btn ghost" id="retake">Retake</button>
        </span>
      </div>
    </header>

    <div id="share-slot"></div>

    <nav class="seg-wrap no-print" aria-label="On this page">
      <div class="seg">
        <a href="#overview" class="on">Overview</a>
        <a href="#position">Position</a>
        <a href="#foundations">Foundations</a>
        <a href="#quality">Quality</a>
        <a href="#exports">Save</a>
        <a href="#answers">Answers</a>
        <a href="#method">Method</a>
      </div>
    </nav>

    <section id="overview" class="cards3" aria-label="Core scales">${CORE.map((d) => axisBlock(d, sc[d])).join('')}</section>
    <p class="small muted scale-note">Scores run from −100 to +100. 0 is the middle of the scale, not the average person. The shaded band shows how much your answers varied from topic to topic within each scale (a wider band means your views differ by topic, or some answers were noisy). It does not predict a retest.</p>

    <section id="position" class="split">
      <figure class="panel compass-card rv">
        <h2 class="title sec-title">${tile('plot', 'teal')}Where you sit.</h2>
        <div class="compass">${e.ok && so.ok ? compassSVG(e.score, so.score, ce, cs, { id: 'pt', animate: motion }) : '<p class="muted">Plot unavailable.</p>'}</div>
      </figure>
      <aside class="panel read-card rv">
        <h2 class="title">Reading the numbers.</h2>
        <div><p class="strong">0 is the midpoint.</p><p class="small muted">Not the average person. +50 means you somewhat agreed with that side on average; +100 means strongly, on every statement.</p></div>
        <div><p class="strong">The band is topic-to-topic spread.</p><p class="small muted">It is not a confidence interval for a retest.</p></div>
        <div class="stack" style="gap:10px"><p class="strong">Labels use provisional cutoffs.</p>
          <div class="cutoffs" aria-hidden="true"><span>strong</span><span>mod.</span><span>lean</span><span class="mid">centre</span><span>lean</span><span>mod.</span><span>strong</span></div>
          <p class="small muted">Under 15 centrist, 15–40 leaning, 40–70 moderately, 70 and above strongly. Set from what the answers mean, not from population data.</p></div>
      </aside>
    </section>

    <section class="panel rv" id="short" aria-labelledby="short-h">
      <div class="panel-head">
        <h2 class="title sec-title" id="short-h">${tile('sliders', 'teal')}Short scales</h2>
        <p class="small muted">4 statements each, indicative only. They cut across left and right rather than lining up with them, so they aren't part of the plot above.</p>
      </div>
      ${SHORT.map((d) => shortRow(d, sc[d])).join('')}
    </section>

    <section class="split">
      <article class="panel rv" id="foundations">
        <div class="panel-head">
          <h2 class="title sec-title">${tile('columns', 'orange')}Moral foundations</h2>
          <p class="small muted">Each foundation compared with your own average across all 18 statements, so a general habit of agreeing cancels out. Raw 1–5 average in brackets.</p>
        </div>
        <div class="mf">${mfRows(R)}</div>
        <div class="mf-scale"><span>−1.5</span><span>your average</span><span>+1.5</span></div>
        <p class="small mf-read">${R.mfRead?.html ?? ''}</p>
      </article>
      <article class="panel rv" id="label">
        <h2 class="title sec-title">${tile('tag', 'teal')}Label vs. positions</h2>
        ${labelLine(S, R)}
        <p class="small">${R.self?.html || 'No self-placement recorded.'}</p>
      </article>
    </section>

    <section class="panel rv" id="quality">
      <div class="panel-head row-between">
        <div><h2 class="title sec-title">${tile('check', 'green')}How much to trust this</h2><p class="small muted">High means no failed check and at most one to review.</p></div>
        <p class="grade ${q.grade.s}">${statusIcon(q.grade.s, 24)}${q.grade.t}</p>
      </div>
      <dl class="diag">${dRows}</dl>
    </section>

    <div id="extras" class="stack extras"></div>

    <section class="panel rv" id="answers">
      <h2 class="title sec-title">${tile('list', 'grey')}Your answers</h2>
      <details><summary>Statement by statement</summary>
        <div class="tablewrap"><table><thead><tr><th>Item</th><th>Statement</th><th>Your answer</th><th>Agree points to</th></tr></thead><tbody>${itemRows}</tbody></table></div>
        <p class="small muted">Items ending in a and b are the two sides of one pair. Highlighted rows are pairs where you agreed with both sides or disagreed with both.</p>
      </details>
    </section>

    <section class="panel rv" id="method">
      <h2 class="title sec-title">${tile('doc', 'grey')}Method</h2>
      <details><summary>How labels and cutoffs work</summary>
        <div class="prose">
          <p>A scale score is your average answer toward its + pole, times 50. So +50 means you <i>somewhat agreed</i> with that side on average, and +100 means <i>strongly</i> on every statement. The word labels use provisional cutoffs: under 15 is centrist (within about a third of a step of neutral), 15–40 leaning, 40–70 moderately, 70 and above strongly. These are set from what the answers mean, not from population data, and will change once norms are added.</p>
        </div>
      </details>
      <details><summary>Method and sources</summary>
        <div class="prose">
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
    </section>
  </div>
  ${footer('The items have not yet been field-tested. Scores show your position relative to the scale midpoint, not a percentile among the public. Label cutoffs are provisional.')}
  </div>`;

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
  if (motion) countUp();

  wireBrand(h.home);
  $('copy')!.onclick = () => copyText(shortSummary(R));
  $('retake')!.onclick = h.retake;
  window.scrollTo(0, 0);
  trackSections();
  mountExtras($('extras')!, S, R, h);
}
