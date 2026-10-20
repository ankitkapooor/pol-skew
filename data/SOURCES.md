# Benchmark data sources

The optional "Compare with Americans" module uses public survey data. Only **derived, aggregate**
tables (`data/norms/*.json`) are committed. Raw microdata stays in `data/raw/`, which is gitignored,
and must never be committed.

Item wording, variable names, response codes and weights in `data/benchmark-items.json` were checked
on 19 Oct 2026 against the documents listed below. Do not edit them from memory; re-check against the
codebook if a source releases a new version.

## ANES 2024 Time Series Study (full release)

|                |                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Release        | Full release, **August 8, 2025 version** (third release; supersedes the two preliminary releases)                                              |
| N              | 5,521 (fresh in-person, fresh web, 2016–2020–2024 panel; GSS cross-over cases not yet released)                                                |
| Where          | https://electionstudies.org/data-center/2024-time-series-study/ (free registration required)                                                   |
| Documents used | _ANES 2024 Time Series Study User Guide and Codebook_ (20250808) and _Pre-Election and Post-Election Survey Questionnaires_ (August 8, 2025)   |
| Weight         | `V240108a`: pre-election weight, full sample (fresh in-person + fresh web + panel) without paper (PAPI) cases                                  |
| Population     | U.S. adult citizens                                                                                                                            |
| Variables      | `V241177`, `V241239`, `V241245`, `V241248`, `V241252`, `V241258`, `V241372x` (from `V241370`/`V241371`), `V241378x` (from `V241376`/`V241377`) |

**Why `V240108a`.** All benchmark items are pre-election, so the User Guide's "Weight variable
selection" table calls for a pre-election weight. The 245 paper-questionnaire (PAPI) respondents are
coded `-1. Inapplicable` on several items and answered a differently worded abortion item (`V241249`),
so the weight that excludes PAPI cases keeps every percentile tied to one wording. The pipeline drops
cases whose weight is missing or ≤ 0.

**Missing codes** recoded to NA: `-9` Refused, `-8` Don't know, `-4` Error, `-2` DK/RF in a component,
`-1` Inapplicable. `99. Haven't thought much about this` is shown to respondents (it is an offered
option in the source) and counted in per-item distributions, but excluded from composites.

**Citation (required by ANES):**

> American National Election Studies. 2025. ANES 2024 Time Series Study Full Release [dataset and documentation]. August 8, 2025 version. www.electionstudies.org

**Terms of use.** ANES data are distributed under conditions the user accepts at registration
(including no attempt to identify respondents and citation of the data). The ANES site blocked
automated access when this file was written, so **the owner must read the current conditions of use
when downloading and record any further obligations here** before publishing norms.

## Cooperative Election Study (CES) 2024 Common Content

|            |                                                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Release    | Harvard Dataverse **V9**, final release (published 2025-09-05)                                                                         |
| DOI        | https://doi.org/10.7910/DVN/X11EP6                                                                                                     |
| N          | ≈ 60,000 adults, pre- and post-election waves                                                                                          |
| Files      | `CCES24_Common_OUTPUT_vv_topost_final.csv` (MD5 `b740b9305fee50e1a34656b513f55c57`), `CES_2024_GUIDE_vv.pdf`, `CCES24_Common_pre.docx` |
| Weight     | `commonweight` (the guide's recommendation for describing adult Americans with pre-election items)                                     |
| Population | U.S. adults                                                                                                                            |
| Variables  | `CC24_328e` (Medicaid expansion), `CC24_326a` (EPA and CO2), `CC24_323a` (legal status)                                                |
| Licence    | **CC0 1.0** (public domain dedication); citation is still good practice                                                                |

**Missing codes** recoded to NA: `8` Skipped, `9` Not asked, and blank cells.

**Citation:**

> Schaffner, Brian; Shih, Marissa; Ansolabehere, Stephen; Pope, Jeremy, 2025, "Cooperative Election Study Common Content, 2024", https://doi.org/10.7910/DVN/X11EP6, Harvard Dataverse, V9.

## Item selection and neutrality

- ANES 7-point scales cover the economic dimension (services and spending, government vs. private
  health insurance, guaranteed jobs and income) and the climate short scale (environment vs.
  business). The social dimension uses the abortion 7-point scale and two policy items on
  transgender bathroom access and job-discrimination protection for gays and lesbians.
- The ANES liberal–conservative self-placement is included verbatim so self-labels can be benchmarked.
- Three CES support/oppose items add single-item comparisons (no composite: composites never mix
  surveys).
- **Excluded:** ANES "aid to blacks" (names a racial group), all candidate and party placements,
  feeling thermometers, and CES items that name a law by its partisan nickname.
- **Documented exceptions:** the health-insurance stem names a private insurer as an example ("Blue
  Cross"); the transgender and gay-rights items name the group the policy concerns. All are kept
  verbatim because a percentile is valid only for the exact source wording.

## Composites

Economic: `anes_services` (reversed), `anes_insurance`, `anes_jobs`. Social: `anes_abortion`,
`anes_trans_bathroom`, `anes_gay_jobs`. Each item is keyed to integer steps 0–6 (0 = left /
progressive), summed to 0–18. Only respondents with a substantive answer to every item in a composite
enter its distribution, and the app shows a composite percentile only when the user answered every
item in it.
