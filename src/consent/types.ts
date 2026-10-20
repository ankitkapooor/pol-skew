import type { Demographics } from './policy';

/** Exactly what is sent when a respondent opts in. Validated strictly by worker/validate.ts. */
export interface SubmissionPayload {
  instrumentVersion: string;
  itemOrder: string[];
  answers: Record<string, number>;
  /** First-response times, rounded to 100 ms. */
  times: Record<string, number>;
  benchmark?: { itemsVersion: string; answers: Record<string, number> };
  demographics?: Demographics;
  retestToken?: string;
  ageConfirmed: true;
  consentVersion: string;
  turnstileToken: string;
}
