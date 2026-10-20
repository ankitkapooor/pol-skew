export const esc = (s: unknown): string =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Signed, rounded score: "+12", "-3", "0". */
export const sgn = (v: number): string => (v > 0 ? '+' : '') + Math.round(v);

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
  document.getElementById(id) as T | null;

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(m: string): void {
  const t = $('toast');
  if (!t) return;
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 1800);
}

function fallbackCopy(t: string, done: string): void {
  const ta = document.createElement('textarea');
  ta.value = t;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast(done);
  } catch {
    toast('Select and copy the text manually');
  }
  ta.remove();
}

export function copyText(t: string, done = 'Summary copied'): void {
  try {
    navigator.clipboard.writeText(t).then(
      () => toast(done),
      () => fallbackCopy(t, done),
    );
  } catch {
    fallbackCopy(t, done);
  }
}

/** Save a Blob as a file via a temporary object URL. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The single mount point, <main id="app">. */
export const app = (): HTMLElement => document.getElementById('app')!;
