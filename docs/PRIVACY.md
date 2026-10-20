# Privacy and data collection

**Sharing requires explicit consent before the quiz.** Answers, timings and results live in `localStorage` on the
respondent's device. Fonts are self-hosted; there are no third-party scripts, analytics, cookies or
trackers. The only network calls are `GET /api/config` (is collection on?) and, if and only if the
respondent opts in, the submission itself and the Turnstile bot check.

This document describes the system; it is not legal advice.

## Opt-in sharing (Task 3)

Before question 1, each new run asks the respondent to choose **Agree and begin** or **Continue
without sharing**. Consent and the age-18 confirmation are unchecked by default. Declining keeps
the entire quiz and results available and sends no responses or bot-check request. The choice is
saved with the run so it survives a reload; older unfinished runs must make an explicit choice when
resumed. Retaking asks again.

For respondents who agree, completed quiz responses are submitted automatically on the results
page after a fresh Turnstile check. Incomplete runs are never submitted. The consent-policy version
is validated by the API and stored with the submission. Optional study demographics and retest
participation are chosen before the quiz. Later benchmark answers are not included in automatic
submissions. Failed submissions show a retry option; they never hide the results. A deletion receipt
is shown after successful submission. Completed runs from older versions retain their manual,
unchecked consent form on the results page.

|                          |                                                                                                                                                                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared**               | answers, first-response times rounded to 100 ms, item order, instrument version, optional U.S. benchmark answers, optional demographics, optional retest token. Scores and quality checks are **recomputed on the server** from the answers.   |
| **Not shared or stored** | name, email, IP address, user agent, cookies, device fingerprint, exact date or time (only the ISO week).                                                                                                                                      |
| **Required**             | current consent-policy version, confirmation that the respondent is 18 or older, and a passed Cloudflare Turnstile check. The Turnstile script is loaded only after agreement, when submitting; the server-side check does not forward the IP. |
| **Deletion**             | the server returns a random submission ID and a deletion code once. Only a SHA-256 of the code is stored. `DELETE /api/submissions/:id` with the code removes the row. Wrong id and wrong code get the same 404.                               |
| **Access**               | there is no read endpoint. Exports go through `scripts/analysis/export.sh`, which needs the owner's Cloudflare login.                                                                                                                          |
| **Rate limiting**        | Workers Rate Limiting binding, 5 requests per minute per client. The client IP is the transient limiter key; it is never written to D1 or logged (Workers Logs are disabled in `wrangler.jsonc`).                                              |

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

## Production configuration

The owner requested collection be enabled on October 20, 2026. Production uses
`COLLECTION_ENABLED = "true"`, a real Turnstile widget for both live hostnames, and an encrypted
`TURNSTILE_SECRET` binding. To pause collection, set `COLLECTION_ENABLED` to `"false"` and redeploy.
The policy shown before agreement defines access, retention, and aggregate publication.

Owner considerations retained from the original deployment checklist:

1. **Confirm the policy text** in `src/consent/policy.ts`: who can access the data, the retention
   period (currently "no longer than five years"), and whether aggregates will be published.
2. **IRB.** If results will be used for academic research or publication, USC IRB review may be
   required _before_ collecting. Political opinions are special-category data under the GDPR and
   sensitive personal information under California law (CPRA).
3. Create the D1 database and Turnstile widget, set the secret, and deploy (see README → Deploy).
