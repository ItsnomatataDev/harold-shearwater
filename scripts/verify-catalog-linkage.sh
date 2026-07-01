#!/usr/bin/env bash
# Verify products, rates, and availability room linkages are aligned.
# Usage: ./scripts/verify-catalog-linkage.sh

set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
SECRET="${INTEGRATION_API_SECRET:-dev_catalog_secret}"
ORG="${ORG_ID:-00000000-0000-4000-8000-000000000001}"
URL="$BASE/api/integrations/catalog/verify-linkage"

echo "→ POST $URL"
RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-integration-secret: $SECRET" \
  -d @- <<JSON
{
  "organizationId": "$ORG"
}
JSON
)

BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1 | cut -d: -f2)

echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo "Status: $CODE"

if [ "$CODE" != "200" ]; then
  echo "❌ Linkage verification request failed"
  exit 1
fi

OK=$(echo "$BODY" | python3 -c "import json,sys; print('yes' if json.load(sys.stdin).get('ok') else 'no')" 2>/dev/null || echo "no")
if [ "$OK" = "yes" ]; then
  echo "✅ Catalog, rates, and room linkages look good"
else
  echo "⚠️  Linkage issues found — review the report above"
  exit 1
fi
