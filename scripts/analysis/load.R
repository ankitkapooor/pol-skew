# Load a D1 export (wrangler `d1 execute --json`) into one row per submission.
suppressPackageStartupMessages(library(jsonlite))

load_key <- function(path = "data/instrument-key.json") {
  key <- fromJSON(path, simplifyVector = TRUE)
  key$paired <- as.data.frame(key$paired)
  key$mf <- as.data.frame(key$mf)
  key
}

parse_json_col <- function(x) if (is.null(x) || identical(x, NA)) NULL else fromJSON(x, simplifyVector = FALSE)

load_submissions <- function(path, key) {
  raw <- fromJSON(path, simplifyVector = FALSE)
  rows <- if (!is.null(raw[[1]]$results)) raw[[1]]$results else raw
  ids <- c(key$paired$id, key$mf$id, "AC", "IF", "SP")
  out <- lapply(rows, function(r) {
    a <- parse_json_col(r$answers)
    q <- parse_json_col(r$quality)
    s <- parse_json_col(r$scores)
    d <- parse_json_col(r$demographics)
    rec <- list(
      id = r$id,
      created_week = r$created_week,
      instrument_version = r$instrument_version,
      retest_token = if (is.null(r$retest_token)) NA_character_ else r$retest_token,
      grade = q$grade,
      attn = q$checks$attn$state,
      infreq = q$checks$infreq$state,
      age_band = if (is.null(d$ageBand)) NA_character_ else d$ageBand,
      country = if (is.null(d$country)) NA_character_ else d$country,
      education = if (is.null(d$education)) NA_character_ else d$education
    )
    for (dim in c(key$core, key$short)) {
      sc <- s$scales[[dim]]
      rec[[paste0("score_", dim)]] <- if (isTRUE(sc$ok)) sc$score else NA_real_
    }
    for (id in ids) rec[[id]] <- if (is.null(a[[id]])) NA_real_ else as.numeric(a[[id]])
    rec
  })
  df <- do.call(rbind.data.frame, c(out, stringsAsFactors = FALSE))
  rownames(df) <- NULL
  df
}

# Raw Likert answers with No opinion (0) as NA.
likert <- function(df, ids) {
  m <- as.matrix(df[, ids, drop = FALSE])
  m[!(m >= 1 & m <= 5)] <- NA
  m
}

# Keyed 1–5 (5 = toward the + pole) for paired items.
keyed15 <- function(df, key, ids = key$paired$id) {
  m <- likert(df, ids)
  dir <- key$paired$dir[match(ids, key$paired$id)]
  for (j in seq_along(ids)) if (dir[j] < 0) m[, j] <- 6 - m[, j]
  m
}
