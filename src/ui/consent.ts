import { CONSENT_VERSION, POLICY, DEMOGRAPHIC_KEYS, type Demographics } from '../consent/policy';
import type { RunState } from '../state/storage';
import { tile, topBar, wireBrand } from './chrome';
import { $, app, esc } from './dom';
import { demographicsFields, fetchConfig } from './share';

/** Every new run requires an explicit sharing choice before question 1. */
export function renderConsent(
  choose: (sharing: NonNullable<RunState['sharing']>) => void,
  back: () => void,
): void {
  app().innerHTML = `
  <div class="screen alt">
    ${topBar('<span class="muted">Before the quiz</span>')}
    <div class="container narrow consent">
      <button class="link back" id="consent-back">‹ Back</button>
      <header class="stack up">
        <h1 class="headline-sm">May we use your anonymous responses?</h1>
        <p class="subhead">Sharing is optional. You take the same quiz and get the same result either way.</p>
      </header>

      <div class="choices up" style="--d:.08s">
        <section class="choice" aria-labelledby="share-h">
          ${tile('share', 'teal', true)}
          <h2 id="share-h">Share anonymously</h2>
          <p class="muted">If you agree, your completed quiz responses will be sent automatically when you finish, to test whether the questions measure what they claim. Incomplete quizzes are not submitted.</p>
          <div class="checks">
            <label class="check"><input type="checkbox" id="start-consent"> <span>I have read the sharing details and consent to anonymously sharing my completed quiz responses for validation.</span></label>
            <label class="check"><input type="checkbox" id="start-adult"> <span>I am 18 or older.</span></label>
          </div>
          <details class="optional"><summary>Optional study details</summary><div class="stack" style="margin-top:12px">${demographicsFields()}
            <label class="check"><input type="checkbox" id="start-retest"> <span>I can retake the quiz in 2–4 weeks. A random token in this browser will link the two responses.</span></label>
          </div></details>
          <button class="btn block" id="consent-begin" disabled>Agree and begin</button>
        </section>

        <section class="choice" aria-labelledby="private-h">
          ${tile('lock', 'green', true)}
          <h2 id="private-h">Keep it private</h2>
          <p class="muted">Nothing leaves this browser. You still get the full result and every export.</p>
          <button class="btn block ghost" id="private-begin">Continue without sharing</button>
        </section>
      </div>
      <p class="small muted center-text" id="consent-status" role="status">Checking whether sharing is available…</p>

      <section class="stack" aria-labelledby="what-h">
        <h2 class="title" id="what-h">What you share and how it is used</h2>
        <p class="small muted">These responses concern your political opinions. Please read the sharing details before deciding.</p>
        <dl class="group">
          <div><dt>Shared</dt><dd>Your quiz answers, first-response times rounded to a tenth of a second, question order, instrument version, consent-policy version, and any optional study details you choose. Scores and quality checks are calculated on the server.</dd></div>
          <div><dt>Not stored with responses</dt><dd>Your name, email, IP address, user agent, tracking cookies, device fingerprint, or exact submission time. Only the week is kept.</dd></div>
          <div><dt>Purpose</dt><dd>${esc(POLICY.purpose)}</dd></div>
          <div><dt>Responsible</dt><dd>${esc(POLICY.controller)}. ${esc(POLICY.access)}</dd></div>
          <div><dt>Retention</dt><dd>${esc(POLICY.retention)}</dd></div>
          <div><dt>Publication</dt><dd>${esc(POLICY.publication)}</dd></div>
          <div><dt>Deletion</dt><dd>After sharing, save the submission ID and deletion code shown on your results page. Use them to delete your response later.</dd></div>
          <div><dt>Bot check</dt><dd>A Cloudflare bot check loads only after you agree, when submitting your completed quiz.</dd></div>
        </dl>
      </section>
    </div>
  </div>`;
  wireBrand(back);
  let available = false;
  const consent = $<HTMLInputElement>('start-consent')!;
  const adult = $<HTMLInputElement>('start-adult')!;
  const agree = $<HTMLButtonElement>('consent-begin')!;
  const status = $('consent-status')!;
  const update = () => {
    agree.disabled = !(available && consent.checked && adult.checked);
  };
  consent.onchange = adult.onchange = update;
  void fetchConfig().then((cfg) => {
    if (!status.isConnected) return;
    available = cfg?.collecting === true;
    status.textContent = available
      ? 'Your choice applies only to this quiz run.'
      : 'Sharing is temporarily unavailable. You can still continue without sharing.';
    update();
  });
  agree.onclick = () => {
    if (agree.disabled) return;
    const demographics: Demographics = {};
    for (const k of DEMOGRAPHIC_KEYS) {
      const value = $<HTMLSelectElement>('demo-' + k)!.value;
      if (value) demographics[k] = value;
    }
    choose({
      choice: 'accepted',
      policyVersion: CONSENT_VERSION,
      demographics,
      offerRetest: $<HTMLInputElement>('start-retest')!.checked,
    });
  };
  $('private-begin')!.onclick = () => choose({ choice: 'declined', policyVersion: CONSENT_VERSION });
  $('consent-back')!.onclick = back;
  window.scrollTo(0, 0);
}
