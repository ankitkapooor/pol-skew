/* Cloudflare Worker: serves the static app (./dist) and the opt-in submissions API.

   Privacy: no IP addresses, user agents or timestamps are stored. The client IP is used only as the
   transient key for the rate limiter binding and is never written to D1 or logged. Turnstile
   verification does not forward the IP. */
import { computeResults } from '../src/scoring/results';
import { byId, wordCount } from '../src/instrument/items';
import { validateSubmission } from './validate';
import { isoWeek, json, normaliseCode, randomCode, safeEqual, sha256Hex } from './util';

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SUBMIT_LIMITER?: RateLimit;
  /** "true" to accept submissions. Off by default until the owner signs off the data policy. */
  COLLECTION_ENABLED?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
}

const MAX_BODY = 64 * 1024;

export async function verifyTurnstile(
  token: string,
  secret: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  const r = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  if (!r.ok) return false;
  const data = (await r.json()) as { success?: boolean };
  return data.success === true;
}

const collecting = (env: Env) =>
  env.COLLECTION_ENABLED === 'true' && !!env.TURNSTILE_SECRET && !!env.TURNSTILE_SITE_KEY;

async function rateLimited(request: Request, env: Env): Promise<boolean> {
  if (!env.SUBMIT_LIMITER) return false;
  const key = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const { success } = await env.SUBMIT_LIMITER.limit({ key });
  return !success;
}

async function readJson(request: Request): Promise<unknown> {
  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > MAX_BODY) throw new Error('too large');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new Error('too large');
  return JSON.parse(text);
}

export async function createSubmission(request: Request, env: Env, now = new Date()): Promise<Response> {
  if (!collecting(env)) return json({ error: 'Collection is not enabled.' }, 503);
  if (!(request.headers.get('content-type') ?? '').includes('application/json'))
    return json({ error: 'Expected JSON.' }, 415);
  if (await rateLimited(request, env)) return json({ error: 'Too many submissions. Try again later.' }, 429);
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: 'Invalid or oversized JSON.' }, 400);
  }
  const v = validateSubmission(body);
  if (!v.ok) return json({ error: v.error }, 422);
  const p = v.value;
  if (!(await verifyTurnstile(p.turnstileToken, env.TURNSTILE_SECRET!)))
    return json({ error: 'Bot check failed.' }, 403);

  // Scores and quality are recomputed server-side from the answers; client-sent values are never trusted.
  const words: Record<string, number> = {};
  for (const id of Object.keys(p.times)) words[id] = wordCount(byId(id).text);
  const R = computeResults(p.answers, p.times, words);
  const scores = { scales: R.sc, mf: R.mf, verdict: R.verdict.title };
  const quality = {
    grade: R.q.grade.t,
    checks: Object.fromEntries(
      Object.entries(R.q.r).map(([k, c]) => [k, { state: c.state, metric: c.metric }]),
    ),
  };

  const id = crypto.randomUUID();
  const code = randomCode();
  await env.DB.prepare(
    `INSERT INTO submissions (id, created_week, instrument_version, item_order, answers, times, quality, scores, benchmark, demographics, retest_token, deletion_hash)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
  )
    .bind(
      id,
      isoWeek(now),
      p.instrumentVersion,
      JSON.stringify(p.itemOrder),
      JSON.stringify(p.answers),
      JSON.stringify(p.times),
      JSON.stringify(quality),
      JSON.stringify(scores),
      p.benchmark ? JSON.stringify(p.benchmark) : null,
      p.demographics ? JSON.stringify(p.demographics) : null,
      p.retestToken ?? null,
      await sha256Hex(code),
    )
    .run();
  return json({ id, deletionCode: code }, 201);
}

export async function deleteSubmission(request: Request, env: Env, id: string): Promise<Response> {
  if (await rateLimited(request, env)) return json({ error: 'Too many requests. Try again later.' }, 429);
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }
  const code = (body as { deletionCode?: unknown })?.deletionCode;
  if (typeof code !== 'string' || code.length > 64) return json({ error: 'Deletion code required.' }, 400);
  const row = await env.DB.prepare('SELECT deletion_hash FROM submissions WHERE id = ?1')
    .bind(id)
    .first<{ deletion_hash: string }>();
  // Same response for "no such id" and "wrong code", so ids can't be probed.
  if (!row || !safeEqual(row.deletion_hash, await sha256Hex(normaliseCode(code))))
    return json({ error: 'No submission matches that id and code.' }, 404);
  await env.DB.prepare('DELETE FROM submissions WHERE id = ?1').bind(id).run();
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  if (path === '/api/config' && request.method === 'GET')
    return json({
      collecting: collecting(env),
      turnstileSiteKey: collecting(env) ? env.TURNSTILE_SITE_KEY : null,
    });
  if (path === '/api/submissions') {
    if (request.method === 'POST') return createSubmission(request, env);
    return json({ error: 'Method not allowed.' }, 405, { allow: 'POST' });
  }
  const m = path.match(/^\/api\/submissions\/([^/]+)$/);
  if (m) {
    if (request.method !== 'DELETE') return json({ error: 'Method not allowed.' }, 405, { allow: 'DELETE' });
    if (!UUID.test(m[1])) return json({ error: 'No submission matches that id and code.' }, 404);
    return deleteSubmission(request, env, m[1]);
  }
  return json({ error: 'Not found.' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env);
      } catch {
        return json({ error: 'Server error.' }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
