import { SPEC } from '../benchmark/spec';
import { INSTRUMENT_VERSION } from '../instrument/version';
import type { RunState } from '../state/storage';
import { roundTime, type Demographics } from './policy';
import type { SubmissionPayload } from './types';

export type { SubmissionPayload };

export function buildPayload(
  S: RunState,
  opts: {
    demographics?: Demographics;
    retestToken?: string;
    turnstileToken: string;
    includeBenchmark: boolean;
  },
): SubmissionPayload {
  const times: Record<string, number> = {};
  for (const [id, ms] of Object.entries(S.times)) times[id] = roundTime(ms);
  const demo = Object.fromEntries(
    Object.entries(opts.demographics ?? {}).filter(([, v]) => v),
  ) as Demographics;
  const p: SubmissionPayload = {
    instrumentVersion: S.version ?? INSTRUMENT_VERSION,
    itemOrder: [...S.order],
    answers: { ...S.answers },
    times,
    ageConfirmed: true,
    turnstileToken: opts.turnstileToken,
  };
  if (opts.includeBenchmark && S.benchmark?.done)
    p.benchmark = { itemsVersion: SPEC.version, answers: { ...S.benchmark.answers } };
  if (Object.keys(demo).length) p.demographics = demo;
  if (opts.retestToken) p.retestToken = opts.retestToken;
  return p;
}
