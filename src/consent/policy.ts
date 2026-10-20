/* Data-sharing policy and optional demographic fields, shared by the consent UI and the API
   validator. Changing what is collected means updating this file, docs/PRIVACY.md and the API tests. */

export const CONSENT_VERSION = '2026-10-20';

export const POLICY = {
  /** Policy approved by the owner when enabling collection. */
  controller: 'Ankit Kapoor (project owner)',
  access: 'Only the project owner can read individual submissions. There is no public way to view them.',
  retention:
    'Submissions are kept until the validation study is finished and for no longer than five years after they are made, then deleted.',
  publication:
    'Anonymous aggregate results (for example averages, reliability statistics and factor loadings) may be published. Individual submissions will not be published.',
  purpose:
    'Testing whether the questions measure what they claim: reliability, structure, item quality and stability over time.',
} as const;

export interface Choice {
  value: string;
  label: string;
}
const PNS: Choice = { value: 'pns', label: 'Prefer not to say' };

/* Each field must earn its place in a validation analysis (see docs/PRIVACY.md). U.S. state was
   considered and dropped: no planned analysis needs it at the target sample size, and combined
   with the other fields it raises re-identification risk. */
export const DEMOGRAPHICS = {
  ageBand: {
    label: 'Age',
    why: 'To check that the scales work the same way across age groups (measurement invariance).',
    choices: [
      { value: '18-24', label: '18–24' },
      { value: '25-34', label: '25–34' },
      { value: '35-44', label: '35–44' },
      { value: '45-54', label: '45–54' },
      { value: '55-64', label: '55–64' },
      { value: '65+', label: '65 or older' },
      PNS,
    ],
  },
  country: {
    label: 'Country you live in',
    why: 'Issue salience differs by country, so the scales must be checked for invariance across countries.',
    choices: [
      { value: 'US', label: 'United States' },
      { value: 'IN', label: 'India' },
      { value: 'GB', label: 'United Kingdom' },
      { value: 'CA', label: 'Canada' },
      { value: 'AU', label: 'Australia' },
      { value: 'DE', label: 'Germany' },
      { value: 'EU-other', label: 'Another EU country' },
      { value: 'other', label: 'Another country' },
      PNS,
    ],
  },
  education: {
    label: 'Highest education completed',
    why: 'Education is linked to how consistently people organise political views, so structure is compared across education levels.',
    choices: [
      { value: 'secondary', label: 'Secondary school or less' },
      { value: 'some-post', label: 'Some college, vocational or associate degree' },
      { value: 'bachelor', label: 'Bachelor’s degree' },
      { value: 'postgrad', label: 'Postgraduate degree' },
      PNS,
    ],
  },
} as const satisfies Record<string, { label: string; why: string; choices: readonly Choice[] }>;

export type DemographicKey = keyof typeof DEMOGRAPHICS;
export const DEMOGRAPHIC_KEYS = Object.keys(DEMOGRAPHICS) as DemographicKey[];
export type Demographics = Partial<Record<DemographicKey, string>>;

/** Response times are rounded to this many milliseconds before sharing. */
export const TIME_ROUNDING_MS = 100;
/** Rounds to 100 ms; any positive time stays ≥ 100 ms so near-instant answers still count as timed. */
export const roundTime = (ms: number): number =>
  ms > 0 ? Math.max(TIME_ROUNDING_MS, Math.round(ms / TIME_ROUNDING_MS) * TIME_ROUNDING_MS) : 0;
