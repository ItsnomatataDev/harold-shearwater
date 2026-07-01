#!/usr/bin/env bash
# Pull GoldenDusk activity + accommodation prices and upsert local rate plans.
# Usage: ./scripts/sync-golden-dusk-rates.sh
# Env: BASE, INTEGRATION_API_SECRET, ORG_ID, RATES_YEAR (optional)

set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
SECRET="${INTEGRATION_API_SECRET:-dev_catalog_secret}"
ORG="${ORG_ID:-00000000-0000-4000-8000-000000000001}"
YEAR="${RATES_YEAR:-$(date +%Y)}"
URL="$BASE/api/integrations/catalog/golden-dusk/rates/sync"

echo "→ POST $URL (year: $YEAR)"
RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-integration-secret: $SECRET" \
  -d @- <<JSON
{
  "organizationId": "$ORG",
  "year": $YEAR
}
JSON
)

BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1 | cut -d: -f2)

echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo "Status: $CODE"

if [ "$CODE" != "200" ]; then
  echo "❌ GoldenDusk rates sync failed"
  exit 1
fi

APPLIED=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('applied',0))" 2>/dev/null || echo "?")
FAILED=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('failed',0))" 2>/dev/null || echo "?")
SKIPPED=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('skipped',0))" 2>/dev/null || echo "?")

echo "✅ GoldenDusk rates sync complete (applied: $APPLIED, skipped: $SKIPPED, failed: $FAILED)"
echo "   Check Agent → Rates and product detail pricing in the portal."

if [ "$FAILED" != "0" ] && [ "$FAILED" != "?" ]; then
  exit 1
fi
