# Simulate submissions in the D1 export format, for smoke-testing the analysis pipeline.
# Usage: Rscript scripts/analysis/simulate.R [n=600] [out=exports/synthetic.json]
# Data are random draws from a six-trait model with an acquiescence factor; they are not real.
suppressPackageStartupMessages({ library(jsonlite); library(MASS) })
source("scripts/analysis/load.R")
args <- commandArgs(trailingOnly = TRUE)
n <- if (length(args) >= 1) as.integer(args[1]) else 600
out <- if (length(args) >= 2) args[2] else "exports/synthetic.json"
set.seed(42)
key <- load_key()
dims <- c(key$core, key$short)
Sigma <- matrix(0.2, 6, 6); diag(Sigma) <- 1; Sigma[1, 2] <- Sigma[2, 1] <- 0.45
foundations <- unique(key$mf$f)

one <- function(theta, acq, careless, token = NULL) {
  ans <- list()
  for (i in seq_len(nrow(key$paired))) {
    it <- key$paired[i, ]
    th <- theta[match(it$dim, dims)]
    v <- if (careless) 5 else round(3 + 0.9 * it$dir * th + acq + rnorm(1, 0, 0.7))
    v <- min(5, max(1, v))
    if (!careless && runif(1) < 0.04) v <- 0
    ans[[it$id]] <- v
  }
  mfth <- rnorm(length(foundations))
  for (i in seq_len(nrow(key$mf))) {
    it <- key$mf[i, ]
    v <- if (careless) 5 else min(5, max(1, round(3.4 + 0.8 * mfth[match(it$f, foundations)] + acq + rnorm(1, 0, 0.7))))
    ans[[it$id]] <- v
  }
  ans$AC <- if (careless) 5 else 2
  ans$IF <- if (careless) 5 else 1
  ans$SP <- min(7, max(1, round(4 + 1.2 * mean(theta[1:2]))))
  scores <- list()
  for (d in dims) {
    ids <- key$paired$id[key$paired$dim == d]
    dir <- key$paired$dir[key$paired$dim == d]
    v <- unlist(ans[ids]); ok <- v >= 1
    scores[[d]] <- list(ok = sum(ok) >= ceiling(0.6 * length(ids)), score = mean((v[ok] - 3) * dir[ok]) * 50)
  }
  grade <- if (careless) "Low" else sample(c("High", "Moderate"), 1, prob = c(0.85, 0.15))
  state <- if (careless) "bad" else "good"
  list(
    id = paste(sample(c(letters, 0:9), 32, TRUE), collapse = ""),
    created_week = sprintf("2026-W%02d", sample(40:52, 1)),
    instrument_version = key$instrumentVersion,
    item_order = "[]",
    answers = as.character(toJSON(ans, auto_unbox = TRUE)),
    times = "{}",
    quality = as.character(toJSON(list(grade = grade, checks = list(attn = list(state = state), infreq = list(state = state))), auto_unbox = TRUE)),
    scores = as.character(toJSON(list(scales = scores), auto_unbox = TRUE)),
    benchmark = NULL,
    demographics = as.character(toJSON(list(country = sample(c("US", "IN", "GB", "other"), 1)), auto_unbox = TRUE)),
    retest_token = token,
    deletion_hash = "x"
  )
}

rows <- list()
thetas <- mvrnorm(n, rep(0, 6), Sigma)
for (i in seq_len(n)) {
  careless <- runif(1) < 0.08
  token <- if (i <= 120 && !careless) paste(sample(c(letters[1:6], 0:9), 32, TRUE), collapse = "") else NULL
  acq <- rnorm(1, 0, 0.3)
  rows[[length(rows) + 1]] <- one(thetas[i, ], acq, careless, token)
  if (!is.null(token)) rows[[length(rows) + 1]] <- one(thetas[i, ] + rnorm(6, 0, 0.35), acq + rnorm(1, 0, 0.1), FALSE, token)
}
dir.create(dirname(out), showWarnings = FALSE, recursive = TRUE)
writeLines(toJSON(list(list(results = rows, success = TRUE)), auto_unbox = TRUE, null = "null"), out)
cat("Wrote", length(rows), "synthetic submissions to", out, "\n")
