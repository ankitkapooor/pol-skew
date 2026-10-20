/* U.S. benchmark module: items asked in their original survey wording and format, shown apart from
   the main inventory, then compared with weighted ANES / CES distributions. */
import { SPEC, BENCHMARK_ITEMS } from '../benchmark/spec';
import { compositeValue, itemCard, readComposite } from '../benchmark/score';
import { SKIPPED, type BenchmarkItem, type BOption, type Norms } from '../benchmark/types';
import { saveRun, type RunState } from '../state/storage';
import { $, app, esc } from './dom';
import { revealWords } from './question';

export interface BenchmarkHandlers {
  /** Return to the results page (after finishing or leaving the module). */
  done: () => void;
}

let keyHandler: ((e: KeyboardEvent) => void) | null = null;
const setKeys = (h: ((e: KeyboardEvent) => void) | null) => {
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = h;
  if (h) document.addEventListener('keydown', h);
};

export function startBenchmark(S: RunState, h: BenchmarkHandlers): void {
  if (!S.benchmark || S.benchmark.done) S.benchmark = { idx: 0, answers: {}, done: false };
  saveRun(S);
  renderBenchmarkQ(S, h);
}

function screenOptions(
  item: BenchmarkItem,
  stage: 'first' | 'follow',
  first?: number,
): { question: string; options: BOption[] } {
  if (item.format === 'branch' && item.branch) {
    if (stage === 'follow' && first !== undefined) {
      const f = item.branch.followUp[String(first)];
      return { question: f.question, options: f.options };
    }
    return { question: item.question, options: item.branch.first };
  }
  return { question: item.question, options: item.options };
}

export function renderBenchmarkQ(S: RunState, h: BenchmarkHandlers): void {
  const B = S.benchmark!;
  const item = BENCHMARK_ITEMS[B.idx];
  const total = BENCHMARK_ITEMS.length;
  const stage = B.first !== undefined ? 'follow' : 'first';
  const { question, options } = screenOptions(item, stage, B.first);
  const src = SPEC.sources[item.source];
  const cur = stage === 'first' ? B.answers[item.id] : undefined;
  const labelled = options.every((o) => o.label);
  const isScale = item.format === 'scale7' && stage === 'first';
  const ticks = BENCHMARK_ITEMS.map(
    (x, i) => `<i class="${i === B.idx ? 'now' : B.answers[x.id] !== undefined ? 'done' : ''}"></i>`,
  ).join('');
  const optButtons =
    isScale && !labelled
      ? `<div class="scale7" role="group" aria-label="Your answer">${options
          .map(
            (o) =>
              `<button class="opt ${cur === o.code ? 'sel' : ''}" data-v="${o.code}" aria-label="${o.code}${o.label ? ': ' + esc(o.label) : ''}"><span class="t mono">${o.code}</span></button>`,
          )
          .join('')}</div>
        <div class="poles"><span>1. ${esc(options[0].label)}</span><span>7. ${esc(options[options.length - 1].label)}</span></div>`
      : `<div class="scale list" role="group" aria-label="Your answer">${options
          .map(
            (o, i) =>
              `<button class="opt ${cur === o.code ? 'sel' : ''}" data-v="${o.code}"><span class="k">${i + 1}</span><span class="t">${esc(o.label)}</span></button>`,
          )
          .join('')}</div>`;
  const nonSub =
    stage === 'first'
      ? item.offeredNonSubstantive
          .map(
            (o) =>
              `<button class="nop ${cur === o.code ? 'sel' : ''}" data-v="${o.code}">${esc(o.label)}</button>`,
          )
          .join('')
      : '';
  app().innerHTML = `
  <div class="screen"><div class="container narrow bench-screen">
  <div class="stack bench" style="gap:24px">
    <div class="ticks" style="grid-template-columns:repeat(${total},1fr)" aria-hidden="true">${ticks}</div>
    <div class="qhead">
      <span class="eyebrow">U.S. benchmark · ${B.idx + 1} of ${total} · ${esc(src.short)} wording</span>
      <button class="link small" id="bquit">Back to results</button>
    </div>
    ${item.intro && stage === 'first' ? `<p class="bintro">${esc(item.intro)}</p>` : ''}
    <p class="statement bstatement" aria-live="polite">${revealWords(question)}</p>
    ${optButtons}
    <div class="alt">
      ${B.idx > 0 || stage === 'follow' ? `<button class="link" id="bback">← Previous</button>` : '<span></span>'}
      <span class="row" style="gap:8px">${nonSub}<button class="link small" id="bskip">Skip this question</button></span>
    </div>
    <p class="kbd">Worded exactly as in ${esc(src.short)}, so your answer can be compared with theirs.</p>
  </div>
  </div></div>`;

  const choose = (v: number) => {
    if (item.format === 'branch' && item.branch && stage === 'first') {
      const terminal = item.branch.terminal[String(v)];
      if (terminal !== undefined) return record(terminal);
      B.first = v;
      saveRun(S);
      return renderBenchmarkQ(S, h);
    }
    if (item.format === 'branch' && item.branch && stage === 'follow') {
      const f = item.branch.followUp[String(B.first)];
      const o = f.options.find((x) => x.code === v)!;
      return record(o.summary);
    }
    record(v);
  };
  const record = (v: number) => {
    B.answers[item.id] = v;
    B.first = undefined;
    if (B.idx < total - 1) {
      B.idx++;
      saveRun(S);
      renderBenchmarkQ(S, h);
    } else {
      B.done = true;
      saveRun(S);
      setKeys(null);
      h.done();
    }
  };
  const back = () => {
    if (B.first !== undefined) B.first = undefined;
    else if (B.idx > 0) B.idx--;
    saveRun(S);
    renderBenchmarkQ(S, h);
  };
  app()
    .querySelectorAll<HTMLButtonElement>('.opt,.nop')
    .forEach((b) => (b.onclick = () => choose(+b.dataset.v!)));
  $('bskip')!.onclick = () => record(SKIPPED);
  const bb = $('bback');
  if (bb) bb.onclick = back;
  $('bquit')!.onclick = () => {
    saveRun(S);
    setKeys(null);
    h.done();
  };
  const codes = options.map((o) => o.code);
  setKeys((e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !document.querySelector('.bstatement')) return;
    const n = +e.key;
    if (/^[1-9]$/.test(e.key) && n <= codes.length) {
      e.preventDefault();
      choose(isScale && !labelled ? n : codes[n - 1]);
    } else if (e.key === 'ArrowLeft' && (B.idx > 0 || B.first !== undefined)) {
      e.preventDefault();
      back();
    }
  });
  window.scrollTo(0, 0);
}

/** Results-page panel: offer, or (once answered) composites and per-item comparisons. */
export function benchmarkPanel(S: RunState, norms: Norms): string {
  const B = S.benchmark;
  const synthetic = norms.synthetic
    ? `<p class="chip bad" style="white-space:normal"><span class="dot"></span>Synthetic test data, not real survey results. Development preview only.</p>`
    : '';
  if (!B || !B.done) {
    const started = B && Object.keys(B.answers).length > 0;
    return `<section class="panel stack bench-panel" id="benchmark">
      <div class="axis-top"><h2>Compare with Americans</h2><span class="small muted">optional · about ${BENCHMARK_ITEMS.length} more questions</span></div>
      ${synthetic}
      <p class="small">Your scores above are measured against the middle of each scale, not against other people. To see where you stand among U.S. adults, answer ${BENCHMARK_ITEMS.length} questions copied word for word from two national surveys, the ANES 2024 Time Series Study and the 2024 Cooperative Election Study. They are separate from the main inventory and don't change your scores.</p>
      <div class="row"><button class="btn ghost" id="bench-start">${started ? 'Continue the comparison' : `Compare with Americans (${BENCHMARK_ITEMS.length} questions)`}</button></div>
    </section>`;
  }
  const comps = (['econ', 'social'] as const)
    .map((k) => {
      const def = SPEC.composites[k];
      const v = compositeValue(def, BENCHMARK_ITEMS, B.answers);
      const t = norms.composites[k];
      const src = norms.sources[def.source];
      if (v === null || !t)
        return `<div class="stack" style="gap:4px"><h3>${def.label[0].toUpperCase() + def.label.slice(1)}</h3><p class="small muted">Answer all ${def.items.length} ${def.label} questions to see a percentile.</p></div>`;
      const r = readComposite(def, t.table, v, src)!;
      return `<div class="stack" style="gap:6px"><h3>${def.label[0].toUpperCase() + def.label.slice(1)}</h3>
        <p class="pct mono">${Math.round(r.share * 100)}%</p>
        <p class="small">${esc(r.sentence)}</p>
        <p class="small muted">Based on ${def.items.length} questions; ${t.unweightedN.toLocaleString('en-US')} respondents answered all of them.</p></div>`;
    })
    .join('');
  const cards = BENCHMARK_ITEMS.map((it) => {
    const c = itemCard(it, B.answers[it.id], norms);
    const src = SPEC.sources[it.source];
    return `<li class="bcard"><p class="small muted mono">${esc(src.short)} · ${esc(it.variable)}</p><p class="bq">${esc(it.question)}</p><p class="small">${c ? esc(c.sentence) : '<span class="muted">Skipped.</span>'}</p></li>`;
  }).join('');
  const srcs = Object.values(norms.sources)
    .map(
      (s) =>
        `<li>${esc(s.citation)} Weight: <span class="mono">${esc(s.weight)}</span>; N = ${s.unweightedN.toLocaleString('en-US')}.</li>`,
    )
    .join('');
  return `<section class="panel stack bench-panel" id="benchmark">
    <div class="axis-top"><h2>Compared with Americans</h2><button class="link small" id="bench-redo">Change answers</button></div>
    ${synthetic}
    <div class="res-grid">${comps}</div>
    <details><summary>Question by question</summary><ul class="bcards">${cards}</ul></details>
    <div class="prose small">
      <p class="small muted">These percentiles describe ${esc(SPEC.sources.anes2024.population)} (ANES) and ${esc(SPEC.sources.ces2024.population)} (CES) in 2024, weighted as each study recommends. Survey mode and sampling error apply, and opinion has moved since then. The comparison uses only the benchmark questions; your main scale scores still have no population norms.</p>
      <ul class="small muted">${srcs}</ul>
    </div>
  </section>`;
}
