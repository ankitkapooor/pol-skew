/** The standard PDF fonts only cover Latin-1: map the few other characters the copy uses. */
export const pdfText = (s: string): string =>
  s
    .replace(/[−–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/≈/g, '~')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/→/g, '->')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '?');
