# Ideology Inventory

A research-informed political-orientation quiz. It places a respondent on separate economic, social and state-authority scales, adds short climate, trade and populism scales, profiles six moral foundations, and checks the quality of the answers. Owner: Ankit (portfolio project; portfolio site https://ankitkapoor.me).

## Where things stand

- The port is done: the modular TypeScript codebase in `src/` is now the source of truth. `legacy/ideology-inventory.html` is the original prototype, kept for reference only. Do not edit it.
- `docs/HANDOFF.md` explains how the instrument works, what changed in the port, and the status of each task. Read it before starting any task.
- Hosting: Cloudflare Worker + static assets + D1 at `polskew.ankitkapoor.me` (owner's choice).

## Work queue

All four tasks are implemented (see the status table in `docs/HANDOFF.md`). Remaining work needs the owner: build real norms from the ANES/CES microdata, sign off the data policy and IRB question, and enable collection. Ask the owner before choosing paid services, creating accounts, or picking between the hosting options listed there.

## Non-negotiables

- **Neutrality of items.** Every ideology statement is a value or preference (not a factual claim), makes one claim, names no party or politician, and has a matched partner on the same topic with equal strength in the opposite direction. Any new item must meet all four.
- **Scoring stays pure.** All scoring lives in side-effect-free functions with unit tests. Changing a formula or threshold requires updating its test and `docs/HANDOFF.md`.
- **Instrument versioning.** Any change to item wording, keying, or scoring bumps `INSTRUMENT_VERSION`. Stored responses always record the version they were collected under.
- **Honesty in the UI.** Cutoffs are labelled provisional; 0 is the scale midpoint, not the average person; the band shows item-to-item spread, not retest reliability. Keep these statements until real norms and validation data replace them.
- **Privacy.** Nothing leaves the browser unless the respondent explicitly opts in. No names, emails, IPs, fingerprints, or third-party analytics. Never commit survey microdata (ANES/CES raw files) to the repo; commit only derived aggregate norm tables with provenance.

## Design

Keep the prototype's visual language: cool grey-blue neutrals, a single ultramarine accent, no red/blue partisan colouring; Familjen Grotesk (UI), Newsreader (statements and prose), IBM Plex Mono (data). Light and dark themes via CSS tokens. Motion: word-by-word statement reveal, animated plot points, respecting `prefers-reduced-motion`. The owner uses https://prompt-motion.com as a reference for motion and visual style.

## Commands

```bash
npm install                 # Node 22+
npm run dev                 # Vite dev server; ?norms=fixture loads synthetic benchmark norms
npm test                    # Vitest unit tests (scoring, quality table, sanity cases, API, exports)
npm run test:e2e            # Playwright (desktop + mobile)
npm run lint                # ESLint + Prettier check
npm run typecheck           # app, tests, worker, node scripts
npm run build               # version:check, then vite build → dist/
npm run version:gen         # after bumping INSTRUMENT_SEMVER for a wording/keying/scoring change
npm run analysis:key        # regenerate data/instrument-key.json after item changes
npm run dev:worker          # build + wrangler dev (needs .dev.vars from .dev.vars.example)
npm run db:migrate:local    # / db:migrate:remote
npm run deploy              # build + wrangler deploy
npm run norms               # Python: build data/norms/us-2024.json from data/raw/ (venv in .venv)
npm run test:norms          # pytest for the norms pipeline
npm run analysis:export     # export D1 submissions (owner's Cloudflare login)
npm run analysis            # R validation report → scripts/analysis/output/report.md
```
