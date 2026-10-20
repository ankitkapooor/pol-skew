import type { Results } from '../scoring/results';
import type { RunState } from '../state/storage';
import { fileStem, todayISO } from '../export/common';
import { jsonExport, textReport } from '../export/text';
import { INSTRUMENT_VERSION } from '../instrument/version';
import { $, downloadBlob, toast } from './dom';

export const exportsPanel = (): string => `
  <section class="panel stack no-print" id="exports">
    <div class="axis-top"><h2>Keep your results</h2><span class="small muted">generated in your browser</span></div>
    <div class="row">
      <button class="btn ghost" id="ex-pdf">PDF report</button>
      <button class="btn ghost" id="ex-png">Share image</button>
      <button class="btn ghost" id="ex-png-sq">Square image</button>
      <button class="btn ghost" id="ex-txt">Text (.txt)</button>
      <button class="btn ghost" id="ex-json">Your data (.json)</button>
      <button class="link small" id="ex-print">Print</button>
    </div>
    <p class="small muted">Exports include the instrument version, the date, your data-quality grade and a note that this is not a validated or norm-referenced instrument. Nothing is uploaded.</p>
  </section>`;

export function wireExports(S: RunState, R: Results): void {
  const meta = { version: S.version ?? INSTRUMENT_VERSION, completedOn: S.completedOn ?? todayISO() };
  const stem = fileStem(meta.completedOn);
  const busy = async (id: string, label: string, job: () => Promise<void>) => {
    const b = $<HTMLButtonElement>(id)!;
    const was = b.textContent;
    b.disabled = true;
    b.textContent = label;
    try {
      await job();
    } catch (err) {
      console.error(err);
      toast('Export failed. Try Print instead.');
    } finally {
      b.disabled = false;
      b.textContent = was;
    }
  };
  $('ex-txt')!.onclick = () =>
    downloadBlob(new Blob([textReport(S, R, meta)], { type: 'text/plain;charset=utf-8' }), `${stem}.txt`);
  $('ex-json')!.onclick = () =>
    downloadBlob(
      new Blob([JSON.stringify(jsonExport(S, R, { ...meta, exportedOn: todayISO() }), null, 2)], {
        type: 'application/json',
      }),
      `${stem}.json`,
    );
  $('ex-png')!.onclick = () =>
    busy('ex-png', 'Drawing…', async () => {
      const { cardBlob } = await import('../export/card');
      downloadBlob(await cardBlob('portrait', R, meta), `${stem}.png`);
    });
  $('ex-png-sq')!.onclick = () =>
    busy('ex-png-sq', 'Drawing…', async () => {
      const { cardBlob } = await import('../export/card');
      downloadBlob(await cardBlob('square', R, meta), `${stem}-square.png`);
    });
  $('ex-pdf')!.onclick = () =>
    busy('ex-pdf', 'Building…', async () => {
      const { pdfBlob } = await import('../export/pdf');
      downloadBlob(await pdfBlob(S, R, meta), `${stem}.pdf`);
    });
  $('ex-print')!.onclick = () => {
    document.querySelectorAll('details').forEach((d) => (d.open = true));
    window.print();
  };
}
