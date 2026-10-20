# Validation analysis for the Ideology Inventory.
#
# Usage: Rscript scripts/analysis/run_analysis.R [export.json] [output_dir]
#   export.json  D1 export from scripts/analysis/export.sh (default: newest exports/submissions-*.json)
#   output_dir   default scripts/analysis/output
#
# Produces report.md plus CSV tables. Only change the instrument (new INSTRUMENT_VERSION) on the
# basis of a report like this one.
suppressPackageStartupMessages({
  library(jsonlite)
  library(psych)
  library(lavaan)
  library(mirt)
})
source("scripts/analysis/load.R")

args <- commandArgs(trailingOnly = TRUE)
input <- if (length(args) >= 1) args[1] else tail(sort(Sys.glob("exports/submissions-*.json")), 1)
if (length(input) == 0 || !file.exists(input)) stop("No export found. Run scripts/analysis/export.sh first.")
outdir <- if (length(args) >= 2) args[2] else "scripts/analysis/output"
dir.create(outdir, showWarnings = FALSE, recursive = TRUE)

TARGETS <- c(efa_cfa = 300, irt = 500, retest = 100)
WEAK_A <- 0.65 # GRM discrimination below this is flagged as weak (Baker's "low" band)
PAIR_FLAG <- -0.2 # pair halves should correlate clearly negatively

key <- load_key()
all <- load_submissions(input, key)
lines <- character()
say <- function(...) lines <<- c(lines, paste0(...))
tbl <- function(df, digits = 2) {
  df[] <- lapply(df, function(x) if (is.numeric(x)) round(x, digits) else x)
  c(paste0("| ", paste(names(df), collapse = " | "), " |"),
    paste0("|", paste(rep("---", ncol(df)), collapse = "|"), "|"),
    apply(df, 1, function(r) paste0("| ", paste(r, collapse = " | "), " |")))
}

# ---- Sample and exclusions -------------------------------------------------------------------
version <- key$instrumentVersion
n_total <- nrow(all)
other_version <- all$instrument_version != version
low <- !other_version & all$grade == "Low"
failed <- !other_version & !low & (all$attn != "good" | all$infreq != "good")
d <- all[!other_version & !low & !failed, ]
# For structure and IRT use each person once: drop the second submission of a retest pair.
first_of_pair <- !duplicated(ifelse(is.na(d$retest_token), d$id, d$retest_token))
d1 <- d[first_of_pair, ]

say("# Ideology Inventory validation report")
say("")
say("- Input: `", basename(input), "`  ")
say("- Instrument version analysed: `", version, "`  ")
say("- Generated: ", format(Sys.Date()), " with R ", R.version$major, ".", R.version$minor,
    ", lavaan ", as.character(packageVersion("lavaan")), ", mirt ", as.character(packageVersion("mirt")),
    ", psych ", as.character(packageVersion("psych")))
say("")
say("## Sample and exclusions")
say("")
say(tbl(data.frame(
  step = c("Submissions in export", "Other instrument versions", "Data-quality grade Low",
           "Failed attention or implausible-statement check", "Analysed (all runs)",
           "Analysed (one run per person)"),
  n = c(n_total, sum(other_version), sum(low), sum(failed), nrow(d), nrow(d1)))))
say("")
tok <- d[!is.na(d$retest_token), ]
tok <- tok[order(tok$retest_token, tok$created_week), ]
counts <- table(tok$retest_token)
linked <- tok[tok$retest_token %in% names(counts[counts == 2]), ]
npairs <- nrow(linked) / 2
say(tbl(data.frame(analysis = c("EFA / CFA", "IRT (graded response)", "Test-retest pairs"),
                   target = TARGETS,
                   available = c(nrow(d1), nrow(d1), npairs)), 0))
say("")

paired <- key$paired
dims <- c(key$core, key$short)
K <- keyed15(d1, key)
raw <- likert(d1, paired$id) - 3

# ---- Reliability ---------------------------------------------------------------------------
omega_cfa <- function(m) {
  df <- as.data.frame(m)
  model <- paste("F =~", paste(colnames(df), collapse = " + "))
  fit <- tryCatch(cfa(model, df, missing = "fiml", estimator = "MLR", std.lv = TRUE), error = function(e) NULL)
  if (is.null(fit) || !lavInspect(fit, "converged")) return(NA_real_)
  pe <- parameterEstimates(fit)
  l <- pe$est[pe$op == "=~"]
  th <- pe$est[pe$op == "~~" & pe$lhs == pe$rhs & pe$lhs %in% colnames(df)]
  sum(l)^2 / (sum(l)^2 + sum(th))
}
rel_row <- function(name, m) {
  a <- tryCatch(psych::alpha(as.data.frame(m), check.keys = FALSE, warnings = FALSE)$total$raw_alpha,
                error = function(e) NA_real_)
  data.frame(scale = name, items = ncol(m), n = sum(rowSums(!is.na(m)) > 0), alpha = a, omega = omega_cfa(m))
}
say("## Reliability")
say("")
if (nrow(d1) >= 30) {
  rel <- do.call(rbind, lapply(dims, function(dm) rel_row(dm, K[, paired$id[paired$dim == dm], drop = FALSE])))
  M <- likert(d1, key$mf$id)
  rel <- rbind(rel, do.call(rbind, lapply(unique(key$mf$f), function(f)
    rel_row(paste0("mf:", f), M[, key$mf$id[key$mf$f == f], drop = FALSE]))))
  write.csv(rel, file.path(outdir, "reliability.csv"), row.names = FALSE)
  say("Cronbach's α and McDonald's ω (total, from a one-factor CFA with FIML) on keyed items.")
  say("")
  say(tbl(rel))
} else say("_Skipped: fewer than 30 analysable runs._")
say("")

# ---- Pair diagnostics ----------------------------------------------------------------------
say("## Pair diagnostics")
say("")
pairs <- unique(paired$pair)
pr <- do.call(rbind, lapply(pairs, function(p) {
  a <- raw[, paste0(p, "a")]; b <- raw[, paste0(p, "b")]
  ok <- !is.na(a) & !is.na(b)
  r <- if (sum(ok) > 10) cor(a[ok], b[ok]) else NA_real_
  data.frame(pair = p, scale = paired$dim[paired$pair == p][1], n = sum(ok), r_raw = r,
             flag = ifelse(!is.na(r) & r > PAIR_FLAG, "weak or positive", ""))
}))
write.csv(pr, file.path(outdir, "pairs.csv"), row.names = FALSE)
say("Correlation between the two halves of each pair on raw (unkeyed) answers. Opposite wordings should correlate clearly negatively; flagged pairs (r > ", PAIR_FLAG, ") may not be true opposites.")
say("")
say(tbl(pr))
say("")

# ---- EFA -----------------------------------------------------------------------------------
say("## Exploratory factor analysis")
say("")
if (nrow(d1) >= 100) {
  R <- cor(K, use = "pairwise.complete.obs")
  pa <- suppressWarnings(fa.parallel(R, n.obs = nrow(d1), fa = "fa", plot = FALSE))
  efa <- suppressWarnings(fa(R, nfactors = length(dims), n.obs = nrow(d1), rotate = "oblimin", fm = "minres"))
  L <- unclass(efa$loadings)
  # Label each factor by the scale whose items load on it most.
  fl <- sapply(seq_len(ncol(L)), function(j) {
    m <- tapply(abs(L[, j]), paired$dim, mean); names(m)[which.max(m)]
  })
  prim <- apply(abs(L), 1, which.max)
  efa_tab <- data.frame(item = paired$id, scale = paired$dim, primary_factor = fl[prim],
                        loading = L[cbind(seq_len(nrow(L)), prim)],
                        matches = ifelse(fl[prim] == paired$dim, "yes", "NO"))
  write.csv(efa_tab, file.path(outdir, "efa_loadings.csv"), row.names = FALSE)
  say("Parallel analysis suggests **", pa$nfact, "** factors (six were specified). Oblimin-rotated minres solution on keyed items; each factor is labelled by the scale loading on it most.")
  say("")
  say("- Items whose primary loading is on their own scale: ", sum(efa_tab$matches == "yes"), " of ", nrow(efa_tab))
  say("- Items with primary loading < 0.30: ", sum(abs(efa_tab$loading) < 0.3))
  say("")
  say(tbl(efa_tab[efa_tab$matches == "NO" | abs(efa_tab$loading) < 0.3, ]))
} else say("_Skipped: fewer than 100 analysable runs (target ", TARGETS["efa_cfa"], ")._")
say("")

# ---- CFA with keying-direction method factor ----------------------------------------------
say("## Confirmatory factor analysis")
say("")
if (nrow(d1) >= 150) {
  df <- as.data.frame(raw)
  traits <- paste(sapply(dims, function(dm) paste(dm, "=~", paste(paired$id[paired$dim == dm], collapse = " + "))), collapse = "\n")
  # Random-intercept acquiescence factor (Maydeu-Olivares & Coffman, 2006): equal loadings on every
  # raw item, orthogonal to the traits. On balanced scales it absorbs the keying-direction artefact.
  # Its variance is the one extra free parameter (std.lv would otherwise fix it to 1).
  method <- paste0("ACQ =~ ", paste0("1*", paired$id, collapse = " + "), "\n",
                   "ACQ ~~ NA*ACQ\n",
                   paste0("ACQ ~~ 0*", dims, collapse = "\n"))
  fit0 <- cfa(traits, df, missing = "fiml", estimator = "MLR", std.lv = TRUE)
  fit1 <- cfa(paste(traits, method, sep = "\n"), df, missing = "fiml", estimator = "MLR", std.lv = TRUE)
  idx <- c("cfi.robust", "tli.robust", "rmsea.robust", "srmr", "bic")
  fm <- rbind(traits_only = fitMeasures(fit0, idx), with_method_factor = fitMeasures(fit1, idx))
  fm <- data.frame(model = rownames(fm), fm, row.names = NULL)
  write.csv(fm, file.path(outdir, "cfa_fit.csv"), row.names = FALSE)
  lrt <- tryCatch(lavTestLRT(fit0, fit1), error = function(e) NULL)
  say("Six correlated traits on raw answers (opposite-keyed items load negatively), with and without an acquiescence method factor.")
  say("")
  say(tbl(fm, 3))
  if (!is.null(lrt) && nrow(lrt) == 2) { say(""); say("Scaled χ² difference: Δχ² = ", round(lrt[2, "Chisq diff"], 1), ", df = ", lrt[2, "Df diff"], ", p = ", signif(lrt[2, "Pr(>Chisq)"], 3), ".") }
  sl <- standardizedSolution(fit1)
  sl <- sl[sl$op == "=~" & sl$lhs != "ACQ", c("lhs", "rhs", "est.std")]
  names(sl) <- c("scale", "item", "std_loading")
  write.csv(sl, file.path(outdir, "cfa_loadings.csv"), row.names = FALSE)
  weak <- sl[abs(sl$std_loading) < 0.3, ]
  say("")
  say("Items with |standardised loading| < 0.30 in the method-factor model: ", nrow(weak), ".")
  if (nrow(weak)) { say(""); say(tbl(weak)) }
  phi <- lavInspect(fit1, "cor.lv")[dims, dims]
  say("")
  say("Trait correlations:")
  say("")
  say(tbl(data.frame(scale = dims, round(phi, 2), row.names = NULL)))
} else say("_Skipped: fewer than 150 analysable runs (target ", TARGETS["efa_cfa"], ")._")
say("")

# ---- IRT -----------------------------------------------------------------------------------
say("## Item response theory (graded response model)")
say("")
if (nrow(d1) >= 200) {
  irt <- do.call(rbind, lapply(key$core, function(dm) {
    m <- K[, paired$id[paired$dim == dm], drop = FALSE]
    fit <- mirt(as.data.frame(m), 1, itemtype = "graded", verbose = FALSE)
    co <- coef(fit, IRTpars = TRUE, simplify = TRUE)$items
    data.frame(scale = dm, item = rownames(co), a = co[, "a"],
               b1 = co[, "b1"], b2 = co[, "b2"], b3 = co[, "b3"], b4 = co[, "b4"],
               flag = ifelse(co[, "a"] < WEAK_A, "weak", ""), row.names = NULL)
  }))
  write.csv(irt, file.path(outdir, "irt_grm.csv"), row.names = FALSE)
  say("Unidimensional GRM per core scale on keyed 1–5 answers (No opinion = missing). Items with discrimination a < ", WEAK_A, " are flagged.")
  if (nrow(d1) < TARGETS["irt"]) { say(""); say("_Below the target of ", TARGETS["irt"], " runs: treat parameters as unstable._") }
  say("")
  say(tbl(irt))
} else say("_Skipped: fewer than 200 analysable runs (target ", TARGETS["irt"], ")._")
say("")

# ---- Test-retest ---------------------------------------------------------------------------
say("## Test–retest stability")
say("")
if (npairs >= 20) {
  icc <- do.call(rbind, lapply(dims, function(dm) {
    col <- paste0("score_", dm)
    w <- matrix(linked[[col]], ncol = 2, byrow = TRUE)
    w <- w[complete.cases(w), , drop = FALSE]
    r <- psych::ICC(w, lmer = FALSE)$results
    data.frame(scale = dm, pairs = nrow(w), ICC_A1 = r$ICC[r$type == "ICC2"],
               lower = r$`lower bound`[r$type == "ICC2"], upper = r$`upper bound`[r$type == "ICC2"])
  }))
  write.csv(icc, file.path(outdir, "retest_icc.csv"), row.names = FALSE)
  say("Two-way random-effects, absolute-agreement, single-measure ICC (ICC(A,1)) on scale scores for ", npairs, " linked pairs that both passed the quality exclusions.")
  if (npairs < TARGETS["retest"]) { say(""); say("_Below the target of ", TARGETS["retest"], " pairs._") }
  say("")
  say(tbl(icc))
} else say("_Skipped: ", npairs, " linked pairs (need at least 20; target ", TARGETS["retest"], ")._")
say("")

say("## Notes")
say("")
say("- Exclusions follow docs/HANDOFF.md: grade-Low runs and any failed attention or implausible-statement check are dropped before every analysis.")
say("- Structure, reliability and IRT use one run per person; retest pairs use both runs.")
say("- A method factor improving fit is the expected artefact of balanced keying, not evidence against the traits.")

writeLines(lines, file.path(outdir, "report.md"))
cat("Wrote", file.path(outdir, "report.md"), "\n")
