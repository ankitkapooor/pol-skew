/* Controller: owns the current run, persists it, and switches between screens. */
import { newOrder } from '../instrument/order';
import { allowsNoOpinion, byId, maxAnswer, wordCount } from '../instrument/items';
import { INSTRUMENT_VERSION } from '../instrument/version';
import { loadRun, saveRun, type RunState } from '../state/storage';
import { renderIntro } from './intro';
import { renderQ } from './question';
import { renderResults } from './results';

let S: RunState | null = loadRun();
let shownAt = 0;

export const getRun = (): RunState | null => S;

const isoDate = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function newRun(): void {
  S = {
    order: newOrder(),
    idx: 0,
    answers: {},
    times: {},
    words: {},
    done: false,
    version: INSTRUMENT_VERSION,
  };
  saveRun(S);
}

export function showIntro(): void {
  renderIntro(S, {
    start: () => {
      newRun();
      showQuestion();
    },
    resume: showQuestion,
    view: () => showResults(false),
  });
}

export function showQuestion(): void {
  if (!S) return;
  renderQ(S, {
    answer,
    back: goBack,
    quit: () => {
      if (S) saveRun(S);
      showIntro();
    },
  });
  shownAt = performance.now();
}

export function showResults(animate: boolean): void {
  if (!S) return;
  renderResults(S, animate, {
    retake: () => {
      newRun();
      showQuestion();
    },
  });
}

function answer(v: number): void {
  if (!S) return;
  const id = S.order[S.idx];
  const it = byId(id);
  if (v === 0 && !allowsNoOpinion(it)) return;
  S.answers[id] = v;
  if (S.times[id] === undefined) {
    S.times[id] = performance.now() - shownAt;
    S.words[id] = wordCount(it.text);
  }
  if (S.idx < S.order.length - 1) {
    S.idx++;
    saveRun(S);
    showQuestion();
  } else {
    S.done = true;
    S.completedOn = isoDate();
    saveRun(S);
    showResults(true);
  }
}

function goBack(): void {
  if (S && S.idx > 0) {
    S.idx--;
    saveRun(S);
    showQuestion();
  }
}

export function onKey(e: KeyboardEvent): void {
  if (!S || S.done || !document.querySelector('.statement')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const max = maxAnswer(byId(S.order[S.idx]));
  if (/^[1-7]$/.test(e.key) && +e.key <= max) {
    e.preventDefault();
    answer(+e.key);
  } else if (e.key === '0') {
    e.preventDefault();
    answer(0);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    goBack();
  }
}

export function start(): void {
  document.addEventListener('keydown', onKey);
  showIntro();
}
