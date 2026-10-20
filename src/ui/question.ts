import { LIKERT, SELF_OPTS, allowsNoOpinion, byId, isSpecial } from '../instrument/items';
import type { RunState } from '../state/storage';
import { $, app, esc } from './dom';

export interface QuestionHandlers {
  answer: (v: number) => void;
  back: () => void;
  quit: () => void;
}

/** Statement split into words that rise in one after another (disabled under prefers-reduced-motion in CSS). */
export const revealWords = (text: string): string =>
  esc(text)
    .split(' ')
    .map((w, i) => `<span class="w" style="animation-delay:${Math.min(i * 28, 700)}ms">${w}</span>`)
    .join(' ');

export function renderQ(S: RunState, h: QuestionHandlers): void {
  const idx = S.idx;
  const id = S.order[idx];
  const it = byId(id);
  const total = S.order.length;
  const cur = S.answers[id];
  const isSelf = isSpecial(it) && it.type === 'self';
  const nop = allowsNoOpinion(it);
  const ticks = S.order
    .map((x, i) => `<i class="${i === idx ? 'now' : S.answers[x] !== undefined ? 'done' : ''}"></i>`)
    .join('');
  const opts: readonly string[] = isSelf ? SELF_OPTS : LIKERT;
  app().innerHTML = `
  <div class="stack" style="gap:20px">
    <div class="ticks" style="grid-template-columns:repeat(${total},1fr)" aria-hidden="true">${ticks}</div>
    <div class="qhead">
      <span class="eyebrow">Item ${idx + 1} of ${total}</span>
      <button class="link small" id="quit">Save and exit</button>
    </div>
    <p class="statement" aria-live="polite">${revealWords(it.text)}</p>
    <div class="scale ${isSelf ? 'list' : ''}" role="group" aria-label="Your answer">
      ${opts.map((t, i) => `<button class="opt ${cur === i + 1 ? 'sel' : ''}" data-v="${i + 1}" id="opt-${i + 1}"><span class="k">${i + 1}</span><span class="t">${t}</span></button>`).join('')}
    </div>
    <div class="alt">
      ${idx > 0 ? `<button class="link" id="back">← Previous</button>` : '<span></span>'}
      ${nop ? `<button class="nop ${cur === 0 ? 'sel' : ''}" id="nop" data-v="0">No opinion <span class="kbd">0</span></button>` : ''}
    </div>
    <p class="kbd">Keys: 1–${opts.length} to answer${nop ? ', 0 for no opinion' : ''}, ← to go back</p>
  </div>`;
  app()
    .querySelectorAll<HTMLButtonElement>('.opt,.nop')
    .forEach((b) => (b.onclick = () => h.answer(+b.dataset.v!)));
  const back = $('back');
  if (back) back.onclick = h.back;
  $('quit')!.onclick = h.quit;
}
