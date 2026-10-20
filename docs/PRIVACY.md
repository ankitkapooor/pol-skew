# Privacy and data collection

**Default: nothing leaves the browser.** Answers, timings and results live in `localStorage` on the
respondent's device. Fonts are self-hosted; there are no third-party scripts, analytics, cookies or
trackers. The only network calls are `GET /api/config` (is collection on?) and, if and only if the
respondent opts in, the submission itself and the Turnstile bot check.

This document describes the system; it is not legal advice.

## Opt-in sharing (Task 3)

Shown on the results page, after the result. The consent box is unchecked by default and the result
is fully available either way.

|                          |                                                                                                                                                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared**               | answers, first-response times rounded to 100 ms, item order, instrument version, optional U.S. benchmark answers, optional demographics, optional retest token. Scores and quality checks are **recomputed on the server** from the answers. |
| **Not shared or stored** | name, email, IP address, user agent, cookies, device fingerprint, exact date or time (only the ISO week).                                                                                                                                    |
| **Required**             | confirmation that the respondent is 18 or older, and a passed Cloudflare Turnstile check. The Turnstile script is loaded only after the consent box is ticked, and the server-side check does not forward the IP.                            |
| **Deletion**             | the server returns a random submission ID and a deletion code once. Only a SHA-256 of the code is stored. `DELETE /api/submissions/:id` with the code removes the row. Wrong id and wrong code get the same 404.                             |
| **Access**               | there is no read endpoint. Exports go through `scripts/analysis/export.sh`, which needs the owner's Cloudflare login.                                                                                                                        |
| **Rate limiting**        | Workers Rate Limiting binding, 5 requests per minute per client. The client IP is the transient limiter key; it is never written to D1 or logged (Workers Logs are disabled in `wrangler.jsonc`).                                            |

Policy wording shown to respondents lives in `src/consent/policy.ts`.

### Optional demographics

All optional, coarse bins, "Prefer not to say" on each, no free text.

| Field                  | Why it is needed for validation                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Age band (6 bins, 18+) | Measurement invariance across age groups.                                                                                                                       |
| Country (8 bins)       | Issue salience differs by country (e.g. India vs. U.S.), so structure must be checked across countries.                                                         |
| Education (4 bins)     | Education is linked to ideological constraint; the factor structure is compared across education levels.                                                        |
| ~~U.S. state~~         | **Dropped.** No planned analysis needs state-level breakdowns at the target sample sizes (300–500), and with the other fields it raises re-identification risk. |

### Test–retest

After consenting, the respondent can offer to retake in 2–4 weeks. A random 128-bit token is stored in
`localStorage` and sent with both submissions; it is deleted after the second. The intro shows a
reminder after 14 days. Nothing but the token links the two submissions.

## Before turning collection on (owner checklist)

Collection ships **disabled** (`COLLECTION_ENABLED = "false"`). Before enabling it:

1. **Confirm the policy text** in `src/consent/policy.ts`: who can access the data, the retention
   period (currently "no longer than five years"), and whether aggregates will be published.
2. **IRB.** If results will be used for academic research or publication, USC IRB review may be
   required _before_ collecting. Political opinions are special-category data under the GDPR and
   sensitive personal information under California law (CPRA).
3. Create the D1 database and Turnstile widget, set the secret, and deploy (see README → Deploy).
