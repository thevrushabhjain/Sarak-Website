#!/usr/bin/env bash
set -euo pipefail
# Operate from the @sarak/api package root so pnpm/wrangler resolve this project.
cd "$(dirname "$0")/.."
CI=true npx wrangler d1 migrations apply sarak --local
pnpm exec tsx scripts/import-legacy.ts
CI=true npx wrangler d1 execute sarak --local --file migrations/seeds/0003_legacy.sql -y
CI=true npx wrangler d1 execute sarak --local -y --command \
  "SELECT (SELECT COUNT(*) FROM activities) AS a,(SELECT COUNT(*) FROM programs) AS p"
