# Ideology Inventory

A research-informed political-orientation quiz. It places a respondent on separate economic, social and state-authority scales, adds short climate, trade and populism scales, profiles six moral foundations, and checks the quality of the answers. Owner: Ankit (portfolio project; portfolio site https://ankitkapoor.me).

## Where things stand

- `legacy/ideology-inventory.html` is the working prototype: one self-contained HTML file (HTML, CSS and vanilla JS, no build). It is the **source of truth** for the item bank, scoring rules and visual design until the port is done. Do not edit it; port from it.
- `docs/HANDOFF.md` explains exactly how the prototype works and specifies the work queue. Read it before starting any task.

## Work queue (in order)

1. Port the prototype into a modular, tested codebase (no behaviour changes).
2. U.S. benchmark norms from ANES 2024 and CES public data.
3. Consented, anonymous response collection for validation (pilot, factor analysis, IRT, retest).
4. Export results as PDF, PNG and text.

Each is specified in `docs/HANDOFF.md`. Finish and test one before starting the next. Ask the owner before choosing paid services, creating accounts, or picking between the hosting options listed there.

## Non-negotiables

- **Neutrality of items.** Every ideology statement is a value or preference (not a factual claim), makes one claim, names no party or politician, and has a matched partner on the same topic with equal strength in the opposite direction. Any new item must meet all four.
- **Scoring stays pure.** All scoring lives in side-effect-free functions with unit tests. Changing a formula or threshold requires updating its test and `docs/HANDOFF.md`.
- **Instrument versioning.** Any change to item wording, keying, or scoring bumps `INSTRUMENT_VERSION`. Stored responses always record the version they were collected under.
- **Honesty in the UI.** Cutoffs are labelled provisional; 0 is the scale midpoint, not the average person; the band shows item-to-item spread, not retest reliability. Keep these statements until real norms and validation data replace them.
- **Privacy.** Nothing leaves the browser unless the respondent explicitly opts in. No names, emails, IPs, fingerprints, or third-party analytics. Never commit survey microdata (ANES/CES raw files) to the repo; commit only derived aggregate norm tables with provenance.

## Design

Keep the prototype's visual language: cool grey-blue neutrals, a single ultramarine accent, no red/blue partisan colouring; Familjen Grotesk (UI), Newsreader (statements and prose), IBM Plex Mono (data). Light and dark themes via CSS tokens. Motion: word-by-word statement reveal, animated plot points, respecting `prefers-reduced-motion`. The owner uses https://prompt-motion.com as a reference for motion and visual style.

## Commands

Fill this in once the toolchain from Task 1 exists (install, dev, test, lint, build, deploy).
