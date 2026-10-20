import { describe, expect, it, vi } from 'vitest';
import { ALL_IDS, ITEMS } from '../../src/instrument/items';
import { INSTRUMENT_VERSION } from '../../src/instrument/version';
import { CONSENT_VERSION } from '../../src/consent/policy';
import { mulberry32, newOrder } from '../../src/instrument/order';
import { validateSubmission } from '../../worker/validate';
import { isoWeek, normaliseCode, randomCode, safeEqual, sha256Hex } from '../../worker/util';
import worker, { createSubmission, handleApi, type Env } from '../../worker/index';

function validBody(): Record<string, unknown> {
  const answers: Record<string, number> = {};
  ITEMS.forEach((i, n) => (answers[i.id] = (n % 5) + 1));
  Object.assign(answers, { AC: 2, IF: 1, SP: 4 });
  const times = Object.fromEntries(ALL_IDS.map((id) => [id, 4321]));
  return {
    instrumentVersion: INSTRUMENT_VERSION,
    itemOrder: newOrder(mulberry32(1)),
    answers,
    times,
    ageConfirmed: true,
    consentVersion: CONSENT_VERSION,
    turnstileToken: 'tok',
  };
}

describe('validateSubmission', () => {
  it('accepts a complete payload and rounds times to 100 ms', () => {
    const v = validateSubmission(validBody());
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value.times.E1a).toBe(4300);
  });

  it.each([
    ['missing age confirmation', (b: Record<string, unknown>) => (b.ageConfirmed = false)],
    ['missing sharing consent', (b: Record<string, unknown>) => delete b.consentVersion],
    ['outdated sharing consent', (b: Record<string, unknown>) => (b.consentVersion = 'old')],
    ['unknown version', (b: Record<string, unknown>) => (b.instrumentVersion = '9.9.9+deadbeef')],
    ['extra field', (b: Record<string, unknown>) => (b.ip = '1.2.3.4')],
    ['missing token', (b: Record<string, unknown>) => (b.turnstileToken = '')],
    ['short order', (b: Record<string, unknown>) => (b.itemOrder = (b.itemOrder as string[]).slice(1))],
    [
      'duplicate in order',
      (b: Record<string, unknown>) => {
        const o = b.itemOrder as string[];
        o[1] = o[0];
      },
    ],
    ['unknown answer id', (b: Record<string, unknown>) => ((b.answers as Record<string, number>).ZZ = 3)],
    ['answer out of range', (b: Record<string, unknown>) => ((b.answers as Record<string, number>).E1a = 6)],
    [
      'no opinion on a check item',
      (b: Record<string, unknown>) => ((b.answers as Record<string, number>).AC = 0),
    ],
    ['SP out of range', (b: Record<string, unknown>) => ((b.answers as Record<string, number>).SP = 8)],
    ['missing answer', (b: Record<string, unknown>) => delete (b.answers as Record<string, number>).M1],
    ['non-integer answer', (b: Record<string, unknown>) => ((b.answers as Record<string, number>).M1 = 2.5)],
    ['negative time', (b: Record<string, unknown>) => ((b.times as Record<string, number>).M1 = -1)],
    ['unknown time id', (b: Record<string, unknown>) => ((b.times as Record<string, number>).X = 1)],
    ['bad demographics value', (b: Record<string, unknown>) => (b.demographics = { country: 'Atlantis' })],
    ['extra demographics field', (b: Record<string, unknown>) => (b.demographics = { zip: '90210' })],
    ['bad retest token', (b: Record<string, unknown>) => (b.retestToken = 'abc')],
    [
      'bad benchmark version',
      (b: Record<string, unknown>) => (b.benchmark = { itemsVersion: 'x', answers: {} }),
    ],
    [
      'bad benchmark code',
      (b: Record<string, unknown>) =>
        (b.benchmark = { itemsVersion: 'us-2024.1', answers: { anes_jobs: 8 } }),
    ],
  ])('rejects %s', (_, mutate) => {
    const b = validBody();
    mutate(b);
    expect(validateSubmission(b).ok).toBe(false);
  });

  it('accepts optional demographics, benchmark (with skips) and retest token', () => {
    const b = {
      ...validBody(),
      demographics: { ageBand: '25-34', country: 'IN', education: 'pns' },
      benchmark: { itemsVersion: 'us-2024.1', answers: { anes_jobs: 99, anes_libcon: 4, ces_medicaid: -1 } },
      retestToken: 'a'.repeat(32),
    };
    expect(validateSubmission(b).ok).toBe(true);
  });
});

describe('util', () => {
  it('computes ISO weeks', () => {
    expect(isoWeek(new Date('2026-10-19T12:00:00Z'))).toBe('2026-W43');
    expect(isoWeek(new Date('2027-01-01T00:00:00Z'))).toBe('2026-W53');
    expect(isoWeek(new Date('2024-12-30T00:00:00Z'))).toBe('2025-W01');
  });
  it('makes unambiguous codes and normalises typed ones', () => {
    const c = randomCode();
    expect(c).toMatch(/^[A-HJKMNP-TV-Z2-9]{4}(-[A-HJKMNP-TV-Z2-9]{4}){3}$/);
    expect(normaliseCode(c.toLowerCase().replace(/-/g, ' '))).toBe(c);
  });
  it('hashes and compares', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(safeEqual('ab', 'ab')).toBe(true);
    expect(safeEqual('ab', 'ac')).toBe(false);
    expect(safeEqual('ab', 'abc')).toBe(false);
  });
});

/** Minimal in-memory D1 stand-in covering the three statements the Worker uses. */
function fakeDB() {
  const rows = new Map<string, Record<string, unknown>>();
  const cols = [
    'id',
    'created_week',
    'instrument_version',
    'item_order',
    'answers',
    'times',
    'quality',
    'scores',
    'benchmark',
    'demographics',
    'retest_token',
    'deletion_hash',
    'consent_version',
  ];
  const db = {
    rows,
    prepare(sql: string) {
      let args: unknown[] = [];
      const stmt = {
        bind(...a: unknown[]) {
          args = a;
          return stmt;
        },
        async run() {
          if (sql.startsWith('INSERT'))
            rows.set(args[0] as string, Object.fromEntries(cols.map((c, i) => [c, args[i]])));
          if (sql.startsWith('DELETE')) rows.delete(args[0] as string);
          return { success: true };
        },
        async first() {
          return rows.get(args[0] as string) ?? null;
        },
      };
      return stmt;
    },
  };
  return db;
}

const env = (over: Partial<Env> = {}) =>
  ({
    ASSETS: { fetch: async () => new Response('asset') },
    DB: fakeDB(),
    COLLECTION_ENABLED: 'true',
    TURNSTILE_SITE_KEY: 'site',
    TURNSTILE_SECRET: 'secret',
    SUBMIT_LIMITER: { limit: async () => ({ success: true }) },
    ...over,
  }) as unknown as Env & { DB: ReturnType<typeof fakeDB> };

const post = (body: unknown) =>
  new Request('https://polskew.ankitkapoor.me/api/submissions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' },
    body: JSON.stringify(body),
  });

describe('API', () => {
  it('reports whether collection is on, without exposing the secret', async () => {
    const r = await handleApi(new Request('https://x/api/config'), env());
    expect(await r.json()).toEqual({ collecting: true, turnstileSiteKey: 'site' });
    const off = await handleApi(new Request('https://x/api/config'), env({ COLLECTION_ENABLED: 'false' }));
    expect(await off.json()).toEqual({ collecting: false, turnstileSiteKey: null });
  });

  it('refuses submissions while collection is off', async () => {
    const r = await createSubmission(post(validBody()), env({ COLLECTION_ENABLED: 'false' }));
    expect(r.status).toBe(503);
  });

  it('stores a submission with server-computed scores, the week only, and a hashed deletion code', async () => {
    const fetchMock = vi.fn(async () => Response.json({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    const e = env();
    const r = await createSubmission(post(validBody()), e, new Date('2026-10-19T12:00:00Z'));
    expect(r.status).toBe(201);
    const { id, deletionCode } = (await r.json()) as { id: string; deletionCode: string };
    const row = e.DB.rows.get(id)!;
    expect(row.created_week).toBe('2026-W43');
    expect(row.deletion_hash).toBe(await sha256Hex(deletionCode));
    expect(row.consent_version).toBe(CONSENT_VERSION);
    expect(JSON.stringify(row)).not.toContain('203.0.113.9');
    expect(JSON.parse(row.quality as string).grade).toMatch(/High|Moderate|Low/);
    expect(JSON.parse(row.scores as string).scales.econ.ok).toBe(true);
    // Turnstile is verified without forwarding the client IP.
    const form = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(form.get('remoteip')).toBeNull();

    // Delete: wrong code → 404, right code (typed loosely) → 204.
    const del = (code: string) =>
      handleApi(
        new Request(`https://x/api/submissions/${id}`, {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ deletionCode: code }),
        }),
        e,
      );
    expect((await del('AAAA-AAAA-AAAA-AAAA')).status).toBe(404);
    expect((await del(deletionCode.toLowerCase().replace(/-/g, ''))).status).toBe(204);
    expect(e.DB.rows.has(id)).toBe(false);
    vi.unstubAllGlobals();
  });

  it('rejects failed bot checks, bad payloads and rate-limited clients', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ success: false }));
    expect((await createSubmission(post(validBody()), env())).status).toBe(403);
    expect((await createSubmission(post({ nope: 1 }), env())).status).toBe(422);
    const limited = env({
      SUBMIT_LIMITER: { limit: async () => ({ success: false }) } as unknown as RateLimit,
    });
    expect((await createSubmission(post(validBody()), limited)).status).toBe(429);
    vi.unstubAllGlobals();
  });

  it('has no read endpoint and routes non-API paths to static assets', async () => {
    const e = env();
    expect((await worker.fetch(new Request('https://x/api/submissions'), e)).status).toBe(405);
    expect(
      (await worker.fetch(new Request('https://x/api/submissions/abc', { method: 'GET' }), e)).status,
    ).toBe(405);
    expect(await (await worker.fetch(new Request('https://x/'), e)).text()).toBe('asset');
  });
});
