import { ITEMS } from '../instrument/items';
import type { RunState } from '../state/storage';
import { compassSVG } from './compass';
import { $, app } from './dom';

export interface IntroHandlers {
  start: () => void;
  resume: () => void;
  view: () => void;
}

export function renderIntro(S: RunState | null, h: IntroHandlers): void {
  const n = Object.keys(S?.answers || {}).length;
  const resumable = S && !S.done && n > 0;
  const hasResult = S && S.done;
  app().innerHTML = `
  <header class="stack fade">
    <span class="eyebrow">Political orientation inventory · ${ITEMS.length + 3} items · about 12 minutes</span>
    <h1>Where do your views actually sit?</h1>
  </header>
  <section class="intro-grid fade">
    <div class="stack" style="gap:16px">
      <p class="lede">This inventory places you on separate economic, social and state-authority scales, adds short scales for climate, trade and populism, and profiles the moral foundations underneath. It uses the methods survey researchers rely on to reduce noise.</p>
      <div class="row">
        ${
          resumable
            ? `<button class="btn" id="resume">Resume (${n} of ${S.order.length} answered)</button><button class="btn ghost" id="start">Start over</button>`
            : hasResult
              ? `<button class="btn" id="view">View your last result</button><button class="btn ghost" id="start">Retake</button>`
              : `<button class="btn" id="start">Begin</button>`
        }
      </div>
    </div>
    <div>
      <div class="compass">${compassSVG(-38, -22, [-50, -26], [-35, -9])}</div>
      <p class="example-tag">Example result, not yours</p>
    </div>
  </section>
  <section class="spec fade" aria-label="Instrument design">
    <div><b>3 + 3</b><span class="small muted">core ideology scales plus short scales</span></div>
    <div><b>24</b><span class="small muted">matched pairs, each topic worded both ways</span></div>
    <div><b>18</b><span class="small muted">moral-foundation statements, six foundations</span></div>
    <div><b>7</b><span class="small muted">checks on the quality of your answers</span></div>
  </section>
  <section class="panel prose fade">
    <h3 style="font-family:var(--f-display)">Before you start</h3>
    <ul>
      <li>Answer with your own view, not what you think is expected. There are no right answers.</li>
      <li>You'll see many topics twice, worded from opposite sides and far apart. That's deliberate: it separates your view from a general habit of agreeing.</li>
      <li>Use <em>Neither agree nor disagree</em> for a genuinely middle view and <em>No opinion</em> when you haven't formed one; <em>No opinion</em> answers are skipped in scoring.</li>
      <li>No statement names a party or politician. Your answers stay in this browser.</li>
    </ul>
  </section>`;
  const start = $('start');
  if (start) start.onclick = h.start;
  const resume = $('resume');
  if (resume) resume.onclick = h.resume;
  const view = $('view');
  if (view) view.onclick = h.view;
}
