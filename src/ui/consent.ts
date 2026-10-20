import { CONSENT_VERSION, POLICY, DEMOGRAPHIC_KEYS, type Demographics } from '../consent/policy';
import type { RunState } from '../state/storage';
import { $, app, esc } from './dom';
import { demographicsFields, fetchConfig } from './share';

/** Every new run requires an explicit sharing choice before question 1. */
export function renderConsent(
  choose: (sharing: NonNullable<RunState['sharing']>) => void,
  back: () => void,
): void {
  app().innerHTML = `
    <header class="stack fade"><span class="eyebrow">Before the quiz</span><h1>May we use your anonymous responses?</h1></header>
    <section class="panel stack fade">
      <p>Sharing is optional. You can take the full quiz and get the same results either way.</p>
      <p>If you agree, your completed quiz responses will be sent automatically when you finish. Incomplete quizzes are not submitted.</p>
      <details class="prose"><summary>What you share and how it is used</summary>
        <ul class="small notice">
          <li><b>Shared:</b> your quiz answers, first-response times rounded to a tenth of a second, question order, instrument version, consent-policy version, and any optional study details you choose below. Scores and quality checks are calculated on the server.</li>
          <li><b>Not stored with responses:</b> your name, email, IP address, user agent, tracking cookies, device fingerprint, or exact submission time. Only the week is kept.</li>
          <li><b>Purpose:</b> ${esc(POLICY.purpose)}</li>
          <li><b>Responsible:</b> ${esc(POLICY.controller)}. ${esc(POLICY.access)}</li>
          <li><b>Retention:</b> ${esc(POLICY.retention)}</li>
          <li>${esc(POLICY.publication)}</li>
          <li><b>Deletion:</b> after sharing, save the submission ID and deletion code shown on your results page. Use them to delete your response later.</li>
          <li>A Cloudflare bot check loads only after you agree, when submitting your completed quiz.</li>
        </ul>
      </details>
      <p class="small muted">These responses concern your political opinions. Please read the sharing details before deciding.</p>
      <label class="check"><input type="checkbox" id="start-consent"> <span>I have read the sharing details and consent to anonymously sharing my completed quiz responses for validation.</span></label>
      <label class="check"><input type="checkbox" id="start-adult"> <span>I am 18 or older.</span></label>
      <details><summary>Optional study details</summary><div class="stack" style="margin-top:12px">${demographicsFields()}
        <label class="check"><input type="checkbox" id="start-retest"> <span>I can retake the quiz in 2–4 weeks. A random token in this browser will link the two responses.</span></label>
      </div></details>
      <p class="small muted" id="consent-status" role="status">Checking whether sharing is available…</p>
      <div class="row"><button class="btn" id="consent-begin" disabled>Agree and begin</button><button class="btn ghost" id="private-begin">Continue without sharing</button></div>
      <button class="btn ghost" id="consent-back">Back</button>
    </section>`;
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
