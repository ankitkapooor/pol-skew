/* Strict, pure validation of submission payloads. Unknown keys, unknown item ids, out-of-range
   values and unknown instrument versions are all rejected. */
import { BENCHMARK_ITEMS, SPEC } from '../src/benchmark/spec';
import { SKIPPED } from '../src/benchmark/types';
import {
  CONSENT_VERSION,
  DEMOGRAPHICS,
  DEMOGRAPHIC_KEYS,
  roundTime,
  type Demographics,
} from '../src/consent/policy';
import type { SubmissionPayload } from '../src/consent/types';
import { ALL_IDS, allowsNoOpinion, byId, maxAnswer } from '../src/instrument/items';
import { KNOWN_VERSIONS } from '../src/instrument/version';

export type Validation = { ok: true; value: SubmissionPayload } | { ok: false; error: string };

const MAX_TIME_MS = 60 * 60 * 1000;
const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const onlyKeys = (o: Record<string, unknown>, allowed: readonly string[]): string | null => {
  const extra = Object.keys(o).filter((k) => !allowed.includes(k));
  return extra.length ? `unexpected field(s): ${extra.join(', ')}` : null;
};

const BENCH_CODES = new Map(
  BENCHMARK_ITEMS.map((i) => [
    i.id,
    new Set([...i.options.map((o) => o.code), ...i.offeredNonSubstantive.map((o) => o.code), SKIPPED]),
  ]),
);

export function validateSubmission(
  body: unknown,
  knownVersions: readonly string[] = KNOWN_VERSIONS,
): Validation {
  const fail = (error: string): Validation => ({ ok: false, error });
  if (!isObj(body)) return fail('body must be an object');
  const extra = onlyKeys(body, [
    'instrumentVersion',
    'itemOrder',
    'answers',
    'times',
    'benchmark',
    'demographics',
    'retestToken',
    'ageConfirmed',
    'consentVersion',
    'turnstileToken',
  ]);
  if (extra) return fail(extra);

  if (body.ageConfirmed !== true) return fail('age confirmation required');
  if (body.consentVersion !== CONSENT_VERSION) return fail('current sharing consent required');
  if (typeof body.instrumentVersion !== 'string' || !knownVersions.includes(body.instrumentVersion))
    return fail('unknown instrument version');
  if (typeof body.turnstileToken !== 'string' || !body.turnstileToken || body.turnstileToken.length > 2048)
    return fail('missing bot-check token');

  const order = body.itemOrder;
  if (!Array.isArray(order) || order.length !== ALL_IDS.length)
    return fail('itemOrder must list every item once');
  const ids = new Set(ALL_IDS);
  if (new Set(order).size !== order.length || !order.every((id) => typeof id === 'string' && ids.has(id)))
    return fail('itemOrder must list every item once');

  const A = body.answers;
  if (!isObj(A)) return fail('answers must be an object');
  for (const id of ALL_IDS) {
    const v = A[id];
    const it = byId(id);
    const min = allowsNoOpinion(it) ? 0 : 1;
    if (!isInt(v) || v < min || v > maxAnswer(it)) return fail(`answer for ${id} missing or out of range`);
  }
  if (Object.keys(A).length !== ALL_IDS.length) return fail('answers contain unknown item ids');

  const T = body.times;
  if (!isObj(T)) return fail('times must be an object');
  for (const [id, ms] of Object.entries(T)) {
    if (!ids.has(id)) return fail(`times contain unknown item id ${id}`);
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0 || ms > MAX_TIME_MS)
      return fail(`time for ${id} out of range`);
  }

  if (body.benchmark !== undefined) {
    const b = body.benchmark;
    if (!isObj(b)) return fail('benchmark must be an object');
    const e = onlyKeys(b, ['itemsVersion', 'answers']);
    if (e) return fail('benchmark: ' + e);
    if (b.itemsVersion !== SPEC.version) return fail('unknown benchmark version');
    if (!isObj(b.answers)) return fail('benchmark answers must be an object');
    for (const [id, v] of Object.entries(b.answers)) {
      const codes = BENCH_CODES.get(id);
      if (!codes) return fail(`unknown benchmark item ${id}`);
      if (!isInt(v) || !codes.has(v)) return fail(`benchmark answer for ${id} out of range`);
    }
  }

  if (body.demographics !== undefined) {
    const d = body.demographics;
    if (!isObj(d)) return fail('demographics must be an object');
    const e = onlyKeys(d, DEMOGRAPHIC_KEYS);
    if (e) return fail('demographics: ' + e);
    for (const k of DEMOGRAPHIC_KEYS) {
      if (d[k] === undefined) continue;
      if (!DEMOGRAPHICS[k].choices.some((c) => c.value === d[k]))
        return fail(`demographics.${k} not allowed`);
    }
  }

  if (
    body.retestToken !== undefined &&
    (typeof body.retestToken !== 'string' || !/^[0-9a-f]{32}$/.test(body.retestToken))
  )
    return fail('retestToken must be 32 hex characters');

  const times: Record<string, number> = {};
  for (const [id, ms] of Object.entries(T as Record<string, number>)) times[id] = roundTime(ms);
  const value: SubmissionPayload = {
    instrumentVersion: body.instrumentVersion,
    itemOrder: order as string[],
    answers: A as Record<string, number>,
    times,
    ageConfirmed: true,
    consentVersion: CONSENT_VERSION,
    turnstileToken: body.turnstileToken,
  };
  if (body.benchmark) value.benchmark = body.benchmark as SubmissionPayload['benchmark'];
  if (body.demographics) value.demographics = body.demographics as Demographics;
  if (body.retestToken) value.retestToken = body.retestToken as string;
  return { ok: true, value };
}
