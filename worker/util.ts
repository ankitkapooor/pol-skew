export const json = (data: unknown, status = 200, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });

/** ISO-8601 week of a date, e.g. "2026-W43". Only the week is stored, never a timestamp. */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; // no 0/O, 1/I/L, U
/** Human-friendly random code, e.g. "K7QM-2XHD-9RTB-WP4C" (≈ 78 bits). */
export function randomCode(groups = 4, size = 4): string {
  const chars: string[] = [];
  const limit = 256 - (256 % ALPHABET.length); // rejection sampling: no modulo bias
  while (chars.length < groups * size) {
    for (const b of crypto.getRandomValues(new Uint8Array(32))) {
      if (b < limit && chars.length < groups * size) chars.push(ALPHABET[b % ALPHABET.length]);
    }
  }
  return Array.from({ length: groups }, (_, g) => chars.slice(g * size, g * size + size).join('')).join('-');
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison for equal-length hex digests. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Normalises a typed deletion code: uppercase, strip spaces, re-insert dashes. */
export const normaliseCode = (c: string): string =>
  c
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/(.{4})(?=.)/g, '$1-');
