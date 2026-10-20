import { ITEMS } from '../instrument/items';
import type { RunState } from '../state/storage';
import { compassSVG } from './compass';
import { daysSince, getRetest } from '../consent/retest';
import { footer, statusIcon, tile, topBar, wireBrand } from './chrome';
import { $, app } from './dom';

export interface IntroHandlers {
  start: () => void;
  resume: () => void;
  view: () => void;
}

/** Example rows shown beside the example plot; fixed illustrative values, labelled as not yours. */
const EXAMPLE = [
  { name: 'Economic', score: '−38', word: 'leaning left', s: -38, h: 12 },
  { name: 'Social', score: '−22', word: 'leaning progressive', s: -22, h: 13 },
  { name: 'State authority', score: '+6', word: 'centrist', s: 6, h: 12 },
];
const pct = (v: number) => (v + 100) / 2;

export function renderIntro(S: RunState | null, h: IntroHandlers): void {
  const n = Object.keys(S?.answers || {}).length;
  const resumable = S && !S.done && n > 0;
  const hasResult = S && S.done;
  const retest = getRetest();
  const due = retest ? daysSince(retest.firstOn) : -1;
  const total = ITEMS.length + 3;
  const primary = resumable ? h.resume : hasResult ? h.view : h.start;
  const navLabel = resumable ? 'Continue' : hasResult ? 'See result' : 'Take the quiz';
  const reminder =
    retest && due >= 14
      ? `<div class="banner"><div class="container banner-in"><p>It has been ${due} days since you offered to retake the inventory. Retaking now helps test whether the scales are stable over time.</p><button class="btn" id="retest-go">Retake now</button></div></div>`
      : '';
  const examples = EXAMPLE.map(
    (r) => `<div class="mini">
      <div class="mini-top"><span>${r.name}</span><span class="muted num">${r.score} · ${r.word}</span></div>
      <div class="mini-track" aria-hidden="true"><i class="band" style="left:${pct(r.s - r.h)}%;width:${r.h}%"></i><i class="dot" style="left:${pct(r.s)}%"></i></div>
    </div>`,
  ).join('');

  app().innerHTML = `
  <div class="screen">
  ${topBar(`
    <a href="#how" class="hide-sm">How it works</a>
    <a href="#results" class="hide-sm">Results</a>
    <a href="#method" class="hide-sm">Method</a>
    <a href="#privacy" class="hide-sm">Privacy</a>
    <button class="pill" id="nav-cta">${navLabel}</button>`)}
  ${reminder}
  <section class="hero">
    <div class="container hero-in">
      <p class="eyebrow up">Political orientation inventory</p>
      <h1 class="display up" style="--d:.08s">Where do your views actually sit?</h1>
      <p class="subhead up" style="--d:.16s">Separate scales for economics, social values and state power, and the moral foundations beneath them.</p>
      <div class="hero-cta up" style="--d:.24s">
        ${
          resumable
            ? `<button class="btn lg" id="resume">Resume (${n} of ${S.order.length} answered)</button><button class="link cta-link" id="start">Start over</button>`
            : hasResult
              ? `<button class="btn lg" id="view">View your last result</button><button class="link cta-link" id="start">Retake</button>`
              : `<button class="btn lg" id="start">Begin</button>`
        }
      </div>
      <p class="small muted up" style="--d:.32s">${total} statements · About 12 minutes · Nothing to sign up for</p>
    </div>
    <div class="container">
      <figure class="shot up" style="--d:.35s">
        <div class="shot-card">
          <div class="compass">${compassSVG(-38, -22, [-50, -26], [-35, -9])}</div>
          <div class="shot-side">
            <div>
              <p class="small muted">Example result, not yours</p>
              <p class="shot-title">Left-progressive</p>
            </div>
            ${examples}
          </div>
        </div>
      </figure>
    </div>
  </section>

  <section class="section" id="how">
    <div class="container rv">
      <h2 class="headline">Three steps.<br><span class="muted">About twelve minutes.</span></h2>
      <ol class="steps">
        <li>${tile('lock', 'green', true)}<h3>Choose about sharing.</h3><p class="muted">Decide whether to share anonymous responses for validation. Your result is the same either way.</p></li>
        <li>${tile('list', 'teal', true)}<h3>Respond to ${total} statements.</h3><p class="muted">One at a time, from strongly disagree to strongly agree. Many topics appear twice, worded from opposite sides and far apart. That separates your view from a general habit of agreeing.</p></li>
        <li>${tile('plot', 'orange', true)}<h3>See where you sit.</h3><p class="muted">Your position on each scale, the values underneath, and an honest read on how far to trust it.</p></li>
      </ol>
    </div>
  </section>

  <section class="section alt" id="results">
    <div class="container">
      <h2 class="headline rv">A profile, not a label.</h2>
      <div class="bento">
        <article class="b wide rv">
          <p class="label teal">Scales</p>
          <h3>Three core scales.</h3>
          <p class="muted">Economic, social and state authority, each from −100 to +100, with a band that shows how much your answers varied by topic.</p>
          <div class="b-tracks" aria-hidden="true">
            <div class="mini-track"><i class="band" style="left:62%;width:14%"></i><i class="dot" style="left:69%"></i></div>
            <div class="mini-track"><i class="band" style="left:30%;width:12%"></i><i class="dot" style="left:36%"></i></div>
            <div class="mini-track"><i class="band" style="left:41%;width:12%"></i><i class="dot" style="left:47%"></i></div>
          </div>
        </article>
        <article class="b narrow rv">
          <p class="label orange">Foundations</p>
          <h3>Six moral foundations.</h3>
          <p class="muted">Care, equality, proportionality, loyalty, authority and purity, each against your own average.</p>
          <div class="b-bars" aria-hidden="true">
            <i style="margin-left:50%;width:22%"></i><i style="margin-left:50%;width:8%"></i><i class="soft" style="margin-left:50%;width:15%"></i>
            <i class="soft" style="margin-left:39%;width:11%"></i><i class="soft" style="margin-left:32%;width:18%"></i><i class="soft" style="margin-left:35%;width:15%"></i>
          </div>
        </article>
        <article class="b narrow rv">
          <p class="label teal">Short scales</p>
          <h3>Three short scales.</h3>
          <p class="muted">Climate, trade and populism. Four statements each, so they are indicative only.</p>
        </article>
        <article class="b wide rv b-split">
          <div>
            <p class="label green">Quality</p>
            <h3>Seven quality checks.</h3>
            <p class="muted">Attention, contradictions, the habit of agreeing and reading speed, graded in the open.</p>
          </div>
          <ul class="b-list" aria-hidden="true">
            <li>${statusIcon('good', 18)}Attention check<span>Passed</span></li>
            <li>${statusIcon('good', 18)}Contradictory pairs<span>1 of 24</span></li>
            <li>${statusIcon('warn', 18)}No-opinion answers<span>8 of 66</span></li>
          </ul>
        </article>
      </div>
    </div>
  </section>

  <section class="section dark" id="method">
    <div class="container center rv">
      <h2 class="headline">Every topic. From both sides.</h2>
      <p class="subhead">Each topic is asked twice, worded from opposite sides and placed far apart, so a habit of agreeing cancels out instead of looking like a view.</p>
      <dl class="specs">
        <div><dt>matched pairs, each topic worded both ways</dt><dd style="color:#40c8e0">24</dd></div>
        <div><dt>moral-foundation statements</dt><dd style="color:#ff9f0a">18</dd></div>
        <div><dt>checks on the quality of your answers</dt><dd style="color:#30d158">7</dd></div>
        <div><dt>parties or politicians named</dt><dd>0</dd></div>
      </dl>
    </div>
  </section>

  <section class="section" id="privacy">
    <div class="container privacy rv">
      <div class="privacy-lead">
        <span class="privacy-icon">${tile('shield', 'green', true)}</span>
        <h2 class="headline-sm">Your answers stay yours.</h2>
        <p class="muted big">Your answers stay in this browser unless you choose anonymous sharing before the quiz. No names, emails, IP addresses or trackers.</p>
      </div>
      <ul class="plain-list">
        <li><b>There are no right answers.</b><span class="muted">Answer with your own view, not what you think is expected.</span></li>
        <li><b>“Neither” is a real answer.</b><span class="muted">Use <i>Neither agree nor disagree</i> for a genuinely middle view and <i>No opinion</i> when you haven’t formed one; <i>No opinion</i> answers are skipped in scoring.</span></li>
        <li><b>No party or politician is named.</b><span class="muted">Every statement asks for a value or preference, not a judgment about facts.</span></li>
      </ul>
    </div>
  </section>

  <section class="section alt center">
    <div class="container rv center-stack">
      <h2 class="headline">Ready when you are.</h2>
      <button class="btn lg" id="end-cta">${navLabel}</button>
      <p class="small muted">You can stop and pick up where you left off.</p>
    </div>
  </section>
  ${footer('Scores are shown relative to the scale midpoint (0), not the average person. Label cutoffs are provisional until population norms and validation data replace them. The band reflects how answers varied across topics, not test–retest reliability.')}
  </div>`;

  wireBrand(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const start = $('start');
  if (start) start.onclick = h.start;
  const resume = $('resume');
  if (resume) resume.onclick = h.resume;
  const go = $('retest-go');
  if (go) go.onclick = h.start;
  const view = $('view');
  if (view) view.onclick = h.view;
  $('nav-cta')!.onclick = primary;
  $('end-cta')!.onclick = primary;
  window.scrollTo(0, 0);
}
