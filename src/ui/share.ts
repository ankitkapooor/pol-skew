/* Opt-in, anonymous sharing for validation. Nothing is sent unless the respondent ticks the
   consent box, confirms they are 18 or older, passes the bot check and presses Share. */
import { buildPayload } from '../consent/payload';
import { DEMOGRAPHICS, DEMOGRAPHIC_KEYS, POLICY, type Demographics } from '../consent/policy';
import {
  addShared,
  clearRetest,
  getRetest,
  getShared,
  newToken,
  removeShared,
  runFingerprint,
  setRetest,
} from '../consent/retest';
import type { RunState } from '../state/storage';
import { $, copyText, esc, toast } from './dom';

interface ApiConfig {
  collecting: boolean;
  turnstileSiteKey: string | null;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, o: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

export async function fetchConfig(): Promise<ApiConfig | null> {
  try {
    const r = await fetch('/api/config', { headers: { accept: 'application/json' } });
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    return (await r.json()) as ApiConfig;
  } catch {
    return null;
  }
}

let turnstileLoading: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  turnstileLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      turnstileLoading = null;
      reject(new Error('turnstile'));
    };
    document.head.appendChild(s);
  });
  return turnstileLoading;
}

const notice = (): string => `
  <ul class="small notice">
    <li><b>What is shared:</b> your answers, how long you took to first answer each statement (rounded to a tenth of a second), the order the statements were shown in, the instrument version, and, if you choose, your U.S. benchmark answers and the optional questions below. Scores and quality checks are recomputed from your answers.</li>
    <li><b>What is not:</b> no name, email, IP address, tracking cookies or device fingerprint. Only the week of submission is kept, not the date or time.</li>
    <li><b>Purpose:</b> ${esc(POLICY.purpose)}</li>
    <li><b>Access and retention:</b> ${esc(POLICY.access)} ${esc(POLICY.retention)} ${esc(POLICY.publication)}</li>
    <li><b>Deletion:</b> after sharing you get a submission ID and a deletion code, shown once. Either one alone is useless; together they delete your submission.</li>
    <li>Your result above stays fully available whether or not you share.</li>
  </ul>`;

function demographicsFields(): string {
  return DEMOGRAPHIC_KEYS.map((k) => {
    const f = DEMOGRAPHICS[k];
    return `<label class="field"><span>${esc(f.label)} <span class="muted small">(optional)</span></span>
      <select id="demo-${k}"><option value="">—</option>${f.choices.map((c) => `<option value="${c.value}">${esc(c.label)}</option>`).join('')}</select>
      <span class="small muted">${esc(f.why)}</span></label>`;
  }).join('');
}

export function mountShare(slot: HTMLElement, S: RunState, cfg: ApiConfig): void {
  const run = runFingerprint(S.order);
  const already = getShared()[run];
  const retest = getRetest();
  const isRetest = !!retest && retest.firstRun !== run;
  if (already) {
    slot.innerHTML = `<section class="panel stack share" id="share">
      <h2>Thanks for sharing</h2>
      <p class="small">You shared this result anonymously (submission <span class="mono">${esc(already.id)}</span>).</p>
      ${deleteForm()}
    </section>`;
    wireDelete(already.id);
    return;
  }
  slot.innerHTML = `<section class="panel stack share" id="share">
    <div class="axis-top"><h2>Help validate this inventory</h2><span class="small muted">optional</span></div>
    <p class="small">The questions haven't been field-tested yet. Sharing your answers anonymously helps check whether they measure what they claim.${isRetest ? ' <b>This looks like your retest:</b> sharing it links it to your first submission through a random token stored in this browser.' : ''}</p>
    ${notice()}
    <label class="check"><input type="checkbox" id="consent"> <span>I’ve read this and want to share my anonymous answers.</span></label>
    <div id="consent-more" class="stack" hidden>
      <label class="check"><input type="checkbox" id="adult"> <span>I am 18 or older. <span class="muted small">(required)</span></span></label>
      <div class="fields">${demographicsFields()}</div>
      ${S.benchmark?.done ? `<label class="check"><input type="checkbox" id="incl-bench" checked> <span>Include my U.S. benchmark answers.</span></label>` : ''}
      ${!isRetest ? `<label class="check"><input type="checkbox" id="retest"> <span>I’ll retake this in 2–4 weeks to help test stability. <span class="muted small">A random token is saved in this browser to link the two submissions; nothing identifies you.</span></span></label>` : ''}
      <div id="ts"></div>
      <div class="row"><button class="btn" id="share-btn" disabled>Share anonymously</button><span class="small muted" id="share-status" role="status"></span></div>
    </div>
    <p class="small muted">Political opinions are sensitive personal data in many places. Only share if you're comfortable doing so.</p>
    ${deleteForm()}
  </section>`;
  wireDelete();

  let token = '';
  const consent = $<HTMLInputElement>('consent')!;
  const adult = $<HTMLInputElement>('adult')!;
  const btn = $<HTMLButtonElement>('share-btn')!;
  const status = $('share-status')!;
  const update = () => (btn.disabled = !(consent.checked && adult.checked && token));
  consent.onchange = async () => {
    $('consent-more')!.hidden = !consent.checked;
    update();
    if (consent.checked && cfg.turnstileSiteKey && !$('ts')!.dataset.rendered) {
      try {
        await loadTurnstile();
        $('ts')!.dataset.rendered = '1';
        window.turnstile!.render($('ts')!, {
          sitekey: cfg.turnstileSiteKey,
          callback: (t: string) => {
            token = t;
            update();
          },
          'expired-callback': () => {
            token = '';
            update();
          },
        });
      } catch {
        status.textContent = 'The bot check could not load. Try again later.';
      }
    }
  };
  adult.onchange = update;
  btn.onclick = async () => {
    btn.disabled = true;
    status.textContent = 'Sharing…';
    const demographics: Demographics = {};
    for (const k of DEMOGRAPHIC_KEYS) {
      const v = $<HTMLSelectElement>('demo-' + k)!.value;
      if (v) demographics[k] = v;
    }
    const wantRetest = !isRetest && !!$<HTMLInputElement>('retest')?.checked;
    const retestToken = isRetest ? retest!.token : wantRetest ? newToken() : undefined;
    const payload = buildPayload(S, {
      demographics,
      retestToken,
      turnstileToken: token,
      includeBenchmark: !!$<HTMLInputElement>('incl-bench')?.checked,
    });
    try {
      const r = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await r.json()) as { id?: string; deletionCode?: string; error?: string };
      if (!r.ok || !data.id || !data.deletionCode) throw new Error(data.error || 'Sharing failed.');
      addShared(run, data.id);
      if (wantRetest && retestToken)
        setRetest({
          token: retestToken,
          firstOn: S.completedOn ?? new Date().toISOString().slice(0, 10),
          firstRun: run,
        });
      if (isRetest) clearRetest();
      showReceipt(data.id, data.deletionCode, wantRetest);
    } catch (err) {
      status.textContent = err instanceof Error ? err.message : 'Sharing failed.';
      token = '';
      window.turnstile?.reset();
      update();
    }
  };
}

function showReceipt(id: string, code: string, retest: boolean): void {
  const panel = $('share')!;
  panel.innerHTML = `
    <h2>Thank you</h2>
    <p class="small">Your answers were shared anonymously. To delete them later you need both values below. <b>They are shown only once</b> and are not stored in this browser, so save them now.</p>
    <dl class="receipt">
      <dt>Submission ID</dt><dd class="mono" id="r-id">${esc(id)}</dd>
      <dt>Deletion code</dt><dd class="mono" id="r-code">${esc(code)}</dd>
    </dl>
    <div class="row"><button class="btn ghost" id="copy-receipt">Copy both</button></div>
    ${retest ? `<p class="small">We’ll remind you on this page in two weeks. Take the inventory again then; the link between the two submissions is a random token in this browser.</p>` : ''}
    ${deleteForm()}`;
  $('copy-receipt')!.onclick = () =>
    copyText(`Ideology Inventory submission ID: ${id}\nDeletion code: ${code}`, 'Copied');
  wireDelete(id);
}

const deleteForm = (): string => `
  <details class="del"><summary>Delete a shared submission</summary>
    <form class="stack" id="del-form" style="margin-top:12px">
      <label class="field"><span>Submission ID</span><input id="del-id" class="mono" autocomplete="off" spellcheck="false" required></label>
      <label class="field"><span>Deletion code</span><input id="del-code" class="mono" autocomplete="off" spellcheck="false" required></label>
      <div class="row"><button class="btn ghost" type="submit">Delete permanently</button><span class="small muted" id="del-status" role="status"></span></div>
    </form>
  </details>`;

function wireDelete(prefillId?: string): void {
  const form = $<HTMLFormElement>('del-form');
  if (!form) return;
  if (prefillId) $<HTMLInputElement>('del-id')!.value = prefillId;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const id = $<HTMLInputElement>('del-id')!.value.trim().toLowerCase();
    const code = $<HTMLInputElement>('del-code')!.value.trim();
    const st = $('del-status')!;
    st.textContent = 'Deleting…';
    try {
      const r = await fetch(`/api/submissions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ deletionCode: code }),
      });
      if (r.status === 204) {
        removeShared(id);
        st.textContent = 'Deleted.';
        toast('Submission deleted');
      } else {
        const d = (await r.json().catch(() => ({}))) as { error?: string };
        st.textContent = d.error ?? 'Could not delete.';
      }
    } catch {
      st.textContent = 'Could not reach the server.';
    }
  };
}
