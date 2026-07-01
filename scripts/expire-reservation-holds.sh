#!/usr/bin/env bash
set -euo pipefail

# Expire reservation holds past their 72-hour window.
# Env: BASE (default http://localhost:3000), INTEGRATION_API_SECRET, ORG_ID (optional)

BASE="${BASE:-http://localhost:3000}"
SECRET="${INTEGRATION_API_SECRET:-dev_catalog_secret}"
ORG_ID="${ORG_ID:-}"

BODY="{}"
if [[ -n "$ORG_ID" ]]; then
  BODY="{\"organizationId\":\"$ORG_ID\"}"
fi

curl -sS -X POST "$BASE/api/integrations/bookings/expire-holds" \
  -H "Content-Type: application/json" \
  -H "x-integration-secret: $SECRET" \
  -d "$BODY" | jq .
