/* Shared page chrome: brand mark, top bar, footer, icon tiles and status icons. Markup only. */

/** Stroke paths for 24×24 icons. */
const ICONS = {
  lock: '<rect x="5" y="11" width="14" height="9" rx="2.5"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"></path>',
  plot: '<path d="M4 4v16h16"></path><circle cx="14" cy="10" r="2.5"></circle>',
  sliders: '<path d="M4 7h16M4 17h16"></path>',
  columns: '<path d="M3 10l9-6 9 6M5 20h14M7 10v8M12 10v8M17 10v8"></path>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"></path><circle cx="7.5" cy="7.5" r="1"></circle>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"></path>',
  share: '<path d="M12 15V4M8 8l4-4 4 4M5 14v5h14v-5"></path>',
  doc: '<path d="M5 4h10l4 4v12H5z"></path><path d="M9 12h6M9 16h6"></path>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"></path>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"></path>',
  people:
    '<path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a2.5 2.5 0 1 0 0-5M3 20c0-3 2.5-5 5-5s5 2 5 5M15 15c2.5 0 6 1.5 6 5"></path>',
} as const;
export type IconName = keyof typeof ICONS;
export type TileColor = 'teal' | 'orange' | 'green' | 'grey' | 'blue';

export const icon = (name: IconName, size = 24): string =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/** Rounded colour square with a white glyph, as in iOS Settings. */
export const tile = (name: IconName, color: TileColor, large = false): string =>
  `<span class="tile ${color}${large ? ' lg' : ''}" aria-hidden="true">${icon(name)}</span>`;

/** Filled status circle: good (check), warn (exclamation), bad (cross). */
export function statusIcon(state: 'good' | 'warn' | 'bad', size = 20): string {
  const glyph =
    state === 'good'
      ? '<path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>'
      : state === 'warn'
        ? '<path d="M12 7v6M12 16.5v.5" fill="none" stroke="#1d1d1f" stroke-width="2.4" stroke-linecap="round"></path>'
        : '<path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"></path>';
  return `<svg class="status ${state}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle>${glyph}</svg>`;
}

const brandMark =
  '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="6" fill="none" stroke="currentColor" stroke-width="1.6"></rect><circle cx="9" cy="12" r="2.4" fill="var(--logo-red)"></circle><circle cx="15" cy="12" r="2.4" fill="var(--logo-blue)"></circle></svg>';

/** Frosted top bar. `right` is trusted markup for the trailing controls. */
export const topBar = (right = ''): string => `
  <header class="nav">
    <div class="container nav-in">
      <a class="brand" href="/" id="brand">${brandMark}Ideology Inventory</a>
      <div class="nav-links">${right}</div>
    </div>
  </header>`;

export const footer = (note: string): string => `
  <footer class="footer">
    <div class="container footer-in">
      <p>${note}</p>
      <div class="footer-bottom">
        <span>Ideology Inventory, a project by Ankit Kapoor.</span>
        <a href="https://ankitkapoor.me" rel="noopener">ankitkapoor.me</a>
      </div>
    </div>
  </footer>`;

/** Brand link returns to the start screen without a full reload. */
export function wireBrand(home: () => void): void {
  const b = document.getElementById('brand');
  if (b)
    b.onclick = (e) => {
      e.preventDefault();
      home();
    };
}
