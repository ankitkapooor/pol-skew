/* Scoring constants. Every value here is part of the instrument hash (see src/instrument/version.ts):
   changing one requires updating its test, docs/HANDOFF.md, and INSTRUMENT_SEMVER. */

/** Share of a scale's items that must be answered (not "No opinion") to report a score. */
export const MIN_ANSWERED_SHARE = 0.6;
/** Keyed answers run −2…+2; multiplying the mean by this gives a −100…+100 score. */
export const SCORE_MULTIPLIER = 50;
/** z for the 95% item-spread band. */
export const BAND_Z = 1.96;
/** Floor on the item SD used for the band, so a perfectly uniform respondent still gets a band. */
export const BAND_MIN_SD = 0.5;
/** Moral-foundation scores need at least this many of a foundation's 3 items answered. */
export const MF_MIN_ITEMS = 2;

/** Provisional strength cutoffs on |score| (defined by answer meaning, not population norms). */
export const CUTOFFS = { centrist: 15, leaning: 40, moderately: 70 } as const;
/** Self-placement analysis: distance under which the label "matches" a scale, and the mixed-profile threshold. */
export const SELF_MATCH_DISTANCE = 25;
export const SELF_MIXED_THRESHOLD = 25;
/** MF individualising vs binding difference below which the two are "roughly balanced". */
export const MF_BALANCED_DIFF = 0.4;

/** Correct answer to the instructed-response item ("Somewhat disagree"). */
export const ATTENTION_ANSWER = 2;
/** Highest passing answer on the infrequency item (1 or 2 pass). */
export const INFREQ_MAX_PASS = 2;

/** Reading-speed check: an answer is too fast if quicker than BASE + PER_WORD × words seconds (≈ 400 wpm). */
export const SPEED_BASE_S = 0.5;
export const SPEED_PER_WORD_S = 0.15;

/** Quality-check thresholds: [warn above / below, bad above / below]. */
export const QUALITY = {
  contra: { warn: 0.15, bad: 0.3 },
  acq: { warn: 0.45, bad: 0.75 },
  spread: { warn: 0.85, bad: 0.6 },
  speed: { warn: 0.15, bad: 0.3 },
  miss: { warn: 7, bad: 14 },
} as const;

/** Run-order constraints. */
export const ORDER = {
  minPairGap: 8,
  attnStart: 20,
  infreqStart: 44,
  insertWindow: 10,
  // Valid orders are ~0.08% of shuffles: 5,000 tries (the prototype) failed ~2% of runs; 200,000 never does in practice.
  maxTries: 200_000,
} as const;
