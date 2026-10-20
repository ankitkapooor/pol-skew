-- Opt-in, anonymous submissions for instrument validation.
-- No IP, user agent, email, name or exact timestamp is stored: only the ISO week of submission.
CREATE TABLE submissions (
  id                 TEXT PRIMARY KEY,          -- random UUID v4
  created_week       TEXT NOT NULL,             -- e.g. 2026-W43
  instrument_version TEXT NOT NULL,             -- semver+hash the answers were collected under
  item_order         TEXT NOT NULL,             -- JSON array of item ids as shown
  answers            TEXT NOT NULL,             -- JSON {itemId: 0-7}
  times              TEXT NOT NULL,             -- JSON {itemId: ms, rounded to 100}
  quality            TEXT NOT NULL,             -- JSON, recomputed server-side
  scores             TEXT NOT NULL,             -- JSON, recomputed server-side
  benchmark          TEXT,                      -- JSON, optional
  demographics       TEXT,                      -- JSON, optional coarse bins
  retest_token       TEXT,                      -- random 32-hex token linking a test and retest
  deletion_hash      TEXT NOT NULL              -- SHA-256 of the deletion code
);
CREATE INDEX submissions_retest ON submissions (retest_token) WHERE retest_token IS NOT NULL;
CREATE INDEX submissions_version ON submissions (instrument_version);
