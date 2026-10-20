#!/usr/bin/env bash
# Export all submissions from the production D1 database for analysis.
# Authenticates through your Cloudflare login (`npx wrangler login`); there is no public read API.
# The export contains respondent data: it is written to exports/ (gitignored). Never commit it.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p exports
out="exports/submissions-$(date +%Y%m%d).json"
npx wrangler d1 execute pol-skew --remote --json --command "SELECT * FROM submissions" > "$out"
echo "Wrote $out"
