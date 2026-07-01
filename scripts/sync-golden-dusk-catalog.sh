#!/usr/bin/env bash
# Pull accommodation + activities from GoldenDusk and upsert into the local catalog.
# Usage: ./scripts/sync-golden-dusk-catalog.sh
# Env: BASE, INTEGRATION_API_SECRET, ORG_ID

set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
SECRET="${INTEGRATION_API_SECRET:-dev_catalog_secret}"
ORG="${ORG_ID:-00000000-0000-4000-8000-000000000001}"
URL="$BASE/api/integrations/catalog/golden-dusk/sync"

echo "→ POST $URL"
RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-integration-secret: $SECRET" \
  -d @- <<JSON
{
  "organizationId": "$ORG",
  "includeAccommodation": true,
  "includeActivities": true,
  "activitiesAvailableOnly": true
}
JSON
)

BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1 | cut -d: -f2)

echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo "Status: $CODE"

if [ "$CODE" != "200" ]; then
  echo "❌ GoldenDusk catalog sync failed"
  exit 1
fi

APPLIED=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('applied',0))" 2>/dev/null || echo "?")
FAILED=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('failed',0))" 2>/dev/null || echo "?")

echo "✅ GoldenDusk sync complete (applied: $APPLIED, failed: $FAILED)"
echo "   Check Agent → Products and Team → Products in the portal."

if [ "$FAILED" != "0" ] && [ "$FAILED" != "?" ]; then
  exit 1
fi
