-- Record which policy a respondent explicitly agreed to, without a precise timestamp.
ALTER TABLE submissions ADD COLUMN consent_version TEXT;
