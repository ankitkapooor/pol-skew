# Validation analysis

R scripts for the Task 3 validation analysis. They read a D1 export and write
`scripts/analysis/output/report.md` plus CSV tables (`output/` and `exports/` are gitignored because
they contain respondent data).

```bash
Rscript -e 'install.packages(c("jsonlite","psych","GPArotation","lavaan","mirt"))'
npm run analysis:export        # → exports/submissions-YYYYMMDD.json (needs `npx wrangler login`)
npm run analysis               # newest export → scripts/analysis/output/report.md
```

Smoke test on synthetic data (random draws from a six-trait model with acquiescence; not real data):

```bash
Rscript scripts/analysis/simulate.R 600 exports/synthetic.json
Rscript scripts/analysis/run_analysis.R exports/synthetic.json
```

The CFA with FIML on 48 items takes about 10 minutes on a laptop.

| Section          | Method                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exclusions       | Drop other instrument versions, grade Low, and any failed attention or implausible-statement check; counts reported. One run per person for structure and IRT.                |
| Reliability      | Cronbach's α (`psych::alpha`) and McDonald's ω total from a one-factor CFA (FIML), per scale and per moral foundation.                                                        |
| Pair diagnostics | Correlation of each pair's raw halves; should be clearly negative (flag r > −0.2).                                                                                            |
| EFA              | Parallel analysis, then six-factor minres / oblimin on keyed items; reports items not loading primarily on their own scale or below 0.30.                                     |
| CFA              | Six correlated traits on raw answers, with and without a random-intercept acquiescence factor (Maydeu-Olivares & Coffman, 2006); robust fit indices and scaled χ² difference. |
| IRT              | Graded response model per core scale (`mirt`), flags discrimination a < 0.65.                                                                                                 |
| Test–retest      | ICC(A,1) on scale scores for tokens with exactly two quality-passing submissions.                                                                                             |

Targets: ~300 runs for EFA/CFA, ~500 for stable IRT, ~100 linked retests. Change the instrument (and
bump `INSTRUMENT_VERSION`) only on the basis of this report.
