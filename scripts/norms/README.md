# U.S. benchmark norms pipeline

Builds `data/norms/us-2024.json` (aggregate tables only) from ANES 2024 and CES 2024 microdata.

```bash
python3 -m venv .venv && .venv/bin/pip install -r scripts/norms/requirements.txt
# put the raw files in data/raw/ (see data/raw/README.md), then:
npm run norms
npm run test:norms
```

What it does, per `data/benchmark-items.json`:

1. Loads only the needed columns (CSV, `.dta` or `.sav`) and fails loudly if a variable is missing.
2. Drops cases with a missing or non-positive weight (`V240108a` for ANES, `commonweight` for CES).
3. Recodes refused / don't know / inapplicable / skipped to NA. Offered non-substantive options
   ("Haven't thought much about this") stay in per-item distributions.
4. Per item: weighted share of each response.
5. Per composite (ANES economic and social): integer keyed steps summed to 0–18 for respondents who
   answered every item substantively, then a weighted below / equal / above table for every value.
   The app reports the mid-distribution percentile, P(Y < y) + ½ P(Y = y).
6. Writes provenance: source names, release, file name and SHA-256, weight variable, unweighted and
   weighted N, build date, and the repo's git hash.

`make_synthetic.py` generates random data with the same columns. It feeds the end-to-end test and
`data/norms/fixture-synthetic.json`, which the app only loads in development (`?norms=fixture`) and
labels as synthetic.
