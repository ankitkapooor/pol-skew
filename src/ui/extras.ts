import { loadNorms } from '../benchmark/norms';
import type { Results } from '../scoring/results';
import type { RunState } from '../state/storage';
import { benchmarkPanel } from './benchmark';
import { $ } from './dom';

export interface ExtrasHandlers {
  openBenchmark: () => void;
}

/** Mounts the optional results-page modules: exports, U.S. benchmark, and consented sharing. */
export function mountExtras(root: HTMLElement, S: RunState, _R: Results, h: ExtrasHandlers): void {
  root.innerHTML = `<div id="bench-slot"></div>`;
  void loadNorms().then((norms) => {
    const slot = $('bench-slot');
    if (!norms || !slot) return;
    slot.innerHTML = benchmarkPanel(S, norms);
    const start = $('bench-start');
    if (start) start.onclick = h.openBenchmark;
    const redo = $('bench-redo');
    if (redo)
      redo.onclick = () => {
        if (S.benchmark) {
          S.benchmark.done = false;
          S.benchmark.idx = 0;
        }
        h.openBenchmark();
      };
    if (location.hash === '#benchmark') slot.scrollIntoView({ block: 'start' });
  });
}
