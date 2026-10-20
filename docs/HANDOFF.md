# Ideology Inventory: handoff brief

This document tells you how the prototype in `legacy/ideology-inventory.html` works, why it is built that way, and what to build next. Line references are approximate; search the file for the named function or constant.

## Status (October 2026)

All four work-queue tasks are implemented in this repository. What remains needs the owner:

| Task               | State                                                                                                                                        | Owner action needed                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Port            | Done: Vite + vanilla TS, Vitest, Playwright, ESLint/Prettier, CI. Behaviour matches the prototype except the two fixes below.                | none                                                                                                                                         |
| 2. U.S. norms      | Item spec, pipeline, tests and app module done. Benchmark offer is hidden until real norms exist.                                            | Download ANES 2024 (registration) and CES 2024 into `data/raw/`, read the ANES terms, run `npm run norms`, commit `data/norms/us-2024.json`. |
| 3. Validation data | Enabled at the owner's request on October 20, 2026. Explicit pre-quiz consent, automatic completion submission, D1 and production Turnstile. | Research-review considerations remain documented in `docs/PRIVACY.md`.                                                                       |
| 4. Exports         | TXT, JSON, PNG (portrait and square), PDF, print stylesheet.                                                                                 | none                                                                                                                                         |

**Deliberate changes from the prototype**

1. _Run order (§1.3)._ The prototype tried 5,000 shuffles and silently used an unconstrained order if
   none passed. Only about 0.08% of shuffles pass, so that happened in about 2% of runs. The cap is now
   200,000 (`ORDER.maxTries`), which in practice never fails, and the code throws rather than
   returning an invalid order.
2. _Shared response times (Task 3)._ Times are rounded to 100 ms, but any positive time stays at least
   100 ms. Otherwise a near-instant answer would round to 0 and drop out of the server-side speed
   check.

Fonts are self-hosted (`@fontsource-variable/inter`) instead of loaded from Google Fonts, so no request
leaves the browser by default. Apple devices use the system San Francisco face first; Inter is the
fallback elsewhere.

**UI redesign (October 2026).** The interface was rebuilt in a restrained, Apple-inspired style
(see the Design section of `CLAUDE.md`). It is presentation only: item wording, keying, order,
scoring, consent flow, storage and exports are unchanged, so `INSTRUMENT_VERSION` did not change.
Shared chrome lives in `src/ui/chrome.ts`; tokens in `src/styles/tokens.css`. The PNG card and PDF
use the matching light palette in `src/export/common.ts`.

---

## Part 1. How the prototype works

### 1.1 Research basis (why the instrument looks like this)

| Design choice                                                      | Basis                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate economic and social scales instead of one left–right line | Feldman & Johnston (2014), _Political Psychology_ 35(3): two dimensions are the minimum needed to account for policy preferences; only ~45% of a U.S. national sample fit a single dimension. Everett (2013), _PLOS ONE_, SECS: validated separate social/economic subscales. |
| Third scale for state authority vs. civil liberty                  | Authoritarian–libertarian distinction in Duckitt & Sibley's dual-process model.                                                                                                                                                                                               |
| Populism short scale                                               | Populist-attitudes construct, Akkerman, Mudde & Zaslove (2014), _Comparative Political Studies_. Our items are original and balanced, unlike the original all-agree-keyed scale.                                                                                              |
| Six moral foundations incl. equality vs. proportionality           | MFQ-2, Atari et al. (2023), _JPSP_ 125(5). Items are **original wording**, not the official MFQ-2 items (licence for reuse not yet confirmed). Foundations vary substantially by culture, so the UI hedges any left/right interpretation.                                     |
| Matched, balanced pairs                                            | Standard control for acquiescence (yea-saying) bias: half the items keyed each way so a habitual agreer averages to zero.                                                                                                                                                     |
| "No opinion" scored as missing                                     | Non-attitudes literature: forced neutral answers add noise.                                                                                                                                                                                                                   |
| Self-placement asked last                                          | Avoids the label anchoring item answers; enables symbolic vs. operational ideology comparison.                                                                                                                                                                                |

### 1.2 Item bank (constant `ITEMS`)

69 screens in total: 66 scored statements + 2 check items + 1 self-placement.

- Pairs are built with the helper `P(pair, dim, rightText, leftText)`, which returns two items:
  - `{id: pair+'a', pair, dim, dir: +1, text}`: agreeing moves toward the scale's **+ pole**
  - `{id: pair+'b', pair, dim, dir: -1, text}`: agreeing moves toward the **− pole**
- Scales (`DIMS`), with + pole listed second:

| dim        | pairs            | − pole            | + pole              |
| ---------- | ---------------- | ----------------- | ------------------- |
| `econ`     | E1–E6 (12 items) | left              | right               |
| `social`   | S1–S6 (12)       | progressive       | traditional         |
| `auth`     | A1–A6 (12)       | civil-libertarian | order-and-authority |
| `climate`  | C1–C2 (4)        | climate-first     | cost-first          |
| `global`   | G1–G2 (4)        | internationalist  | national-first      |
| `populism` | Q1–Q2 (4)        | pluralist         | populist            |

`CORE = econ, social, auth` (on the plot / main axes). `SHORT = climate, global, populism` (reported separately as "indicative only").

- Moral foundations: `M1`–`M18`, `dim:'mf'`, `f` ∈ care, equality, proportionality, loyalty, authority, purity (3 each). No `dir`; all agree-keyed.
- Special items (`SPECIAL`): `AC` instructed-response attention check (correct answer = 2, "Somewhat disagree"); `IF` infrequency item ("I have never used a phone or a computer", pass = 1 or 2); `SP` 7-point self-placement (`SELF_OPTS`).
- Response scale `LIKERT`: 1 Strongly disagree … 5 Strongly agree. `0` = No opinion. No-opinion is unavailable on `AC`, `IF`, `SP`.

### 1.3 Run order (`newRun`, `orderOK`)

Random shuffle of the 66 statements, re-drawn until two constraints hold: no scale appears three times in a row, and the two halves of a pair are at least 8 positions apart. Then `AC` is inserted at position 20–29, `IF` at 44–53, and `SP` is appended last. (Port: `src/instrument/order.ts`, RNG injectable; retry cap raised, see Status.)

### 1.4 State and persistence

`S = {order, idx, answers:{id:value}, times:{id:ms}, words:{id:wordCount}, done}` saved to `localStorage` key `ideology-inventory-v2` (all access wrapped in try/catch). Only the **first** response time per item is recorded (`performance.now()` from render to first answer), along with the item's word count. (Port: `src/state/storage.ts`; runs also record `version`, `completedOn` and an optional `benchmark` block.)

### 1.5 Scoring (pure functions)

**Scale score: `scoreDim(dim, answers)`**

- For each answered item: keyed value `k = (v − 3) × dir`, range −2…+2.
- Requires ≥ 60% of the scale's items answered, else `ok:false`.
- `score = mean(k) × 50` → −100…+100. +50 ≈ "somewhat agree" with the + side on average.
- Band: `half = 1.96 × max(sd(k), 0.5) / sqrt(n) × 50`, clipped to ±100. This is **item-to-item spread**, not a retest interval; the UI says so.
- `consistency = |mean(k)| / mean(|k|)` (1 = every answer points the same way).
- `contra`/`both`: pairs where both halves were answered and the respondent agreed with both (≥4, ≥4) or disagreed with both (≤2, ≤2).

**Moral foundations: `scoreMF`**

- `personal` = mean of all answered MF items.
- Per foundation (needs ≥2 of 3 answered): `raw` = mean, `rel = raw − personal` (ipsatized, cancels general agreement).
- `ind` = mean raw of care, equality; `bin` = mean raw of loyalty, authority, purity; `diff = ind − bin`.

**Labels**

- `strength(s)`: |s| < 15 centrist, < 40 leaning, < 70 moderately, else strongly. Provisional; defined by answer meaning, not norms.
- `verdict(econ, social)`: both |s| < 15 → Centrist; one near zero → "Economically centrist, socially X" / "Economically X, socially centrist"; else quadrant: Left-progressive (−,−), Conservative (+,+), Libertarian-leaning (econ +, social −), Communitarian (econ −, social +).
- `selfRead`: self-label mapped to `(SP − 4)/3 × 100`. If econ and social have opposite signs and both |s| ≥ 25 → "mixed, no single label fits". Else if the label is within 25 of either scale → match (names the closer scale). Else reports the gap against the econ/social mean as symbolic vs. operational ideology.

**Quality: `quality(answers, times, words)`** returns per-check `{label, value, state: good|warn|bad, note}` and an overall grade.

| Check                                                                     | Bad          | Warn         |
| ------------------------------------------------------------------------- | ------------ | ------------ |
| Attention (`AC` ≠ 2)                                                      | fail         | —            |
| Infrequency (`IF` not 1–2)                                                | fail         | —            |
| Contradictory pairs (share of answered pairs)                             | > 30%        | > 15%        |
| Agreement tendency: mean raw (v−3) over all 48 paired items               | \|x\| > 0.75 | \|x\| > 0.45 |
| Response variety: sd of all 1–5 answers                                   | < 0.6        | < 0.85       |
| Too fast: share of items answered in < 0.5 s + 0.15 s × words (≈ 400 wpm) | > 30%        | > 15%        |
| No-opinion count (of 66)                                                  | > 14         | > 7          |

Grade: High = 0 bad and ≤ 1 warn; Moderate = ≤ 1 bad; Low otherwise.

Sanity cases the tests must reproduce:

- All answers "Strongly agree", 0.9 s each → every ideology score 0; attention, infrequency, contradiction, agreement, variety and speed all `bad`; grade Low.
- Econ items fully right-keyed (a=5, b=1), social fully progressive (a=1, b=4), others mild, 6 s each, checks passed → econ +100, social −75, "Libertarian-leaning", grade High; `selfRead` with SP=4 returns the mixed-profile message.

### 1.6 Rendering

Vanilla DOM via template strings into `<main id="app">`:

- `renderIntro()`: description, example compass (marked "Example result, not yours"), resume/retake buttons, spec strip.
- `renderQ()`: segmented progress ticks, word-by-word statement reveal, 5-option scale (7 for SP), No opinion pill, back link, keyboard 1–7 / 0 / ←.
- `renderResults(animate)`: verdict and chips; `compassSVG()` (x = econ, y = social, traditional up, dashed band box); core axis tracks; short-scale tracks; diverging moral-foundation bars (relative to personal mean, ±1.5 range); label-vs-positions text; quality checklist; item table (contradicted pairs shaded); cutoff explanation; methods and sources; copy-summary.

Design tokens are at the top of the `<style>` block: light values on `:root`, dark under `prefers-color-scheme` and `[data-theme="dark"]`.

---

## Part 2. Work queue

### Task 1. Port to a modular, tested codebase ✅

_Implemented._ `INSTRUMENT_VERSION` is `semver+hash` where the hash is the first 8 hex chars of
SHA-256 over `src/instrument/fingerprint.ts` (items, special items, response options, every constant
in `src/scoring/constants.ts`). `npm run build` and CI fail when the hash is stale.

Goal: identical behaviour and look, maintainable structure.

- Suggested stack: **Vite + TypeScript**, either vanilla TS components or React (pick one and note why in the README). **Vitest** for unit tests, ESLint + Prettier, GitHub Actions CI running lint, typecheck, test, build.
- Suggested layout:
  ```
  src/instrument/items.ts      // item bank, DIMS, INSTRUMENT_VERSION
  src/instrument/order.ts      // newRun / orderOK (inject RNG for tests)
  src/scoring/*.ts             // scoreDim, scoreMF, quality, labels, selfRead
  src/state/storage.ts         // localStorage wrapper
  src/ui/...                   // intro, question, results, compass
  src/styles/tokens.css
  tests/...
  ```
- `INSTRUMENT_VERSION`: semantic version plus a short hash of the serialized item bank and scoring constants, computed at build time.
- Tests: every row of the quality table, both sanity cases in 1.5, band clipping, missing-data thresholds, ordering constraints over many seeds.
- Deliver a README written for portfolio readers: what it measures, the research basis, noise controls, screenshots, live link, limitations.

### Task 2. U.S. benchmark norms (item #11) ✅ (awaiting raw data)

_Implemented._ Eleven items (8 ANES, 3 CES) verified against the codebooks and questionnaires:
`data/benchmark-items.json`, `data/SOURCES.md`. Composites are ANES-only (never mixed across surveys)
and sum integer keyed steps 0–6 per item (0–18). Percentile = P(Y < y) + ½P(Y = y). ANES weight is
`V240108a` (pre-election, full sample without PAPI cases, which saw different abortion wording); the
population is U.S. adult **citizens**, and the UI says so.

Goal: let respondents see where they fall relative to U.S. adults, using public survey microdata, without pretending our own scales have norms.

**Principle.** A percentile is only valid for an item asked with the **exact wording and response format** used in the source survey. So add a separate, optional **benchmark module** of about 10–12 items copied verbatim from the sources. Our matched-pair scales are not converted to percentiles.

**Sources** (owner downloads; the files cannot be fetched from a sandboxed session):

- ANES 2024 Time Series Study, full release 8 Aug 2025, 5,521 respondents (fresh in-person, fresh web, and 2016–2020 panel extension). electionstudies.org; registration required.
- Cooperative Election Study (CES), Harvard Dataverse, common content 2006–2025 plus a Cumulative Policy file. Use the 2024 common content, and 2025 if it fits.
- Before use, read each source's terms of use and required citation, and record them in `data/SOURCES.md`.

**Item selection** (do this from the codebooks; do not guess variable names):

- Pick items that cover the economic and social dimensions, e.g. ANES 7-point issue scales (government services and spending, government vs. private health insurance, abortion) and CES support/oppose policy items.
- Include the ANES 7-point liberal–conservative self-placement verbatim so self-labels can be benchmarked too.
- For each item record: source, year, variable name, exact question text, exact response options and codes, missing/DK/refused codes, weight variable, and which dimension and direction it maps to. Store as `data/benchmark-items.json`.
- Avoid items whose wording names parties, candidates, or racial groups, to stay consistent with the instrument's neutrality rule. Document any exception and the reason.

**Pipeline** (`scripts/norms/`, Python with pandas and pyreadstat, or R):

1. Load raw files from `data/raw/` (gitignored).
2. Recode missing/DK/refused to NA; apply the documented sampling weight for the full-sample estimate (check the codebook for the correct weight for the questions used, e.g. pre- vs. post-election).
3. Per item: weighted distribution of responses → `"X% of U.S. adults gave this answer"`.
4. Benchmark composites (economic, social): sum of keyed benchmark items for respondents who answered all items in that composite; weighted CDF → percentile lookup table.
5. Write `data/norms/us-2024.json` with provenance: source, file version/DOI, SHA-256 of the raw file, weight variable, unweighted N, weighted N, date built, script git hash.
6. Unit-test the weighted-percentile function on a small synthetic fixture with a hand-computed answer.

**App behaviour:**

- After results, offer "Compare with Americans (about 12 more questions)". Run the benchmark items in their original format; show them as clearly separate from the main quiz.
- Show composite percentiles only when every item in that composite was answered. Wording: "More economically left than about X% of U.S. adults (ANES 2024, weighted)."
- Per-item cards: "You chose B. 34% of U.S. adults chose B."
- State limits in the UI: percentiles describe 2024 U.S. adults; survey mode and sampling error apply; the benchmark is separate from the main scales.

### Task 3. Consented, anonymous data collection for validation (item #12) ✅ (collection off)

_Implemented_ on Cloudflare Worker + static assets + D1 (the recommended option; the owner chose
Cloudflare hosting). Extra endpoint `GET /api/config` tells the client whether collection is on.
Scores and quality are recomputed on the server. U.S. state was dropped from demographics (see
`docs/PRIVACY.md`). R analysis in `scripts/analysis/`.

Goal: collect enough real responses to validate the instrument, with explicit consent and minimal data.

**Consent flow (opt-in, never default):**

- Shown on the results page after the respondent sees their result. Unchecked by default; results are fully available whether or not they share.
- Plain-language notice covering:
  - **What is shared:** answers, first-response times rounded to 100 ms, quality metrics, scores, item order, instrument version, optional demographics.
  - **What is not:** no name, email, IP address, cookies for tracking, or device fingerprint.
  - **Purpose:** testing whether the questions measure what they claim.
  - **Retention and access:** who can see the data, how long it is kept, whether anonymized aggregates may be published.
  - **Deletion:** a random deletion code shown once, which the respondent can use to remove their submission.
- Required confirmation that the respondent is 18 or older; do not collect data from anyone who doesn't confirm.
- Political opinions are special-category data under GDPR and sensitive under California law. Tell the owner in the PR description that if results will be used for academic research or publication, USC IRB review may be required before collecting. Don't present any of this as legal advice.

**Optional demographics** (all optional, all with "Prefer not to say", coarse bins only, no free text): age band, country of residence, U.S. state (only if country is U.S.), education band. Each must justify itself for a validation analysis (e.g. measurement invariance by country); drop any that don't.

**Test–retest:**

- After consenting, offer: "Retake in 2–4 weeks to help test stability?"
- If accepted, store a random retest token in `localStorage` and include it with both submissions. The token alone links the two submissions; nothing identifies the person.

**Backend.** Ask the owner to choose. Recommended: **Cloudflare Pages + Worker + D1** (one platform, generous free tier). Alternative: Supabase with row-level security allowing anonymous insert only.

- Endpoints:
  - `POST /api/submissions`: strict schema validation (known item ids, values in range, known instrument version); bot protection (e.g. Cloudflare Turnstile) and rate limiting; no IP logging.
  - `DELETE /api/submissions/:id`: requires the deletion code (stored only as a hash).
  - No public read endpoint. Exports go through an authenticated admin route or CLI.
- Store the week of submission, not an exact timestamp.
- Schema: `id (uuid), created_week, instrument_version, item_order json, answers json, times json, quality json, scores json, benchmark json?, demographics json?, retest_token?, deletion_hash`.

**Analysis** (`scripts/analysis/`, Python or R; R `lavaan` + `mirt` preferred for CFA/IRT):

- Exclude grade-Low runs and failed checks, and report how many were excluded.
- Reliability per scale: McDonald's ω and Cronbach's α.
- Structure: EFA then CFA of the six ideology scales, including a method factor for item keying direction (the expected artefact of balanced scales).
- IRT graded response model per core scale: item discrimination and thresholds; flag weak items.
- Pair diagnostics: correlation between each pair's halves (should be clearly negative).
- Test–retest: ICC per scale on linked submissions.
- Rough sample targets: ~300 complete, quality-passing runs for EFA/CFA; ~500 for stable IRT; ~100 linked retests. Generate a markdown or HTML report, and only update the instrument (new `INSTRUMENT_VERSION`) based on its findings.

### Task 4. Export results (PDF, PNG, text) ✅

_Implemented._ The PDF uses jsPDF standard fonts (Helvetica, Times, Courier) because embedding the
web fonts would need TTF files; text is mapped to Latin-1 (`src/export/pdftext.ts`). The PNG card
draws with the web fonts after `document.fonts.load`.

Goal: let respondents keep their results. This runs on a normal hosted site, so downloads, `window.print()` and canvas export all work, unlike in the prototype's sandbox.

- **Text:** a `.txt` summary (the current "copy summary" content, expanded with every scale, band, label, MF profile, quality grade, instrument version, date). Also a `.json` export of raw answers and scores for people who want their data.
- **PNG:** a dedicated share card (e.g. 1200×1500, plus 1080×1080), drawn to canvas for fidelity: verdict, compass, three core scores, quality grade, instrument version, short disclaimer. Embed the web fonts before drawing so text renders correctly; wait for `document.fonts.ready`.
- **PDF:** a multi-page report (results, short scales, MF profile, quality checks, item-by-item table, method and limitations). Use jsPDF with svg2pdf.js for vector charts, or a dedicated print stylesheet plus a "Save as PDF" button. Prefer the jsPDF route for a one-click download, and keep a print stylesheet as fallback.
- Every export includes the instrument version, date, data-quality grade, and the line: "Not a validated or norm-referenced instrument; 0 is the scale midpoint, not the average person" (update once Tasks 2–3 change this).
- Respect the theme only on screen; exports use the light palette.
- Tests: snapshot the text export; smoke-test that PNG and PDF generation produce non-empty blobs.

---

## Part 3. Sources

- Feldman & Johnston (2014). Understanding the determinants of political ideology. https://scholars.duke.edu/publication/745676
- Everett (2013). The 12 Item Social and Economic Conservatism Scale. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3859575/
- MFQ-2 (Atari et al., 2023) and later validation. https://link.springer.com/article/10.1007/s12144-025-07630-4
- Akkerman, Mudde & Zaslove (2014). How populist are the people? https://research.vu.nl/en/publications/how-populist-are-the-people-measuring-populist-attitudes-in-voter/
- Acquiescence response bias, SAGE Encyclopedia of Survey Research Methods. https://methods.sagepub.com/ency/edvol/embed/encyclopedia-of-survey-research-methods/chpt/acquiescence-response-bias
- ANES 2024 Time Series full release. https://electionstudies.org/anes-announcement-full-release-of-the-2024-time-series-study/
- CES data downloads. https://tischcollege.tufts.edu/research-faculty/research-centers/cooperative-election-study/data-downloads
