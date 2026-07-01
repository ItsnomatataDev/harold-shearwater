#!/usr/bin/env bash
# Smoke-test POST /api/integrations/catalog/products
# Usage: ./scripts/test-products-api.sh
# Env: BASE (default http://localhost:3000), INTEGRATION_API_SECRET

set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
SECRET="${INTEGRATION_API_SECRET:-dev_catalog_secret}"
ORG="${ORG_ID:-00000000-0000-4000-8000-000000000001}"
URL="$BASE/api/integrations/catalog/products"
EXT_ID="TEST-PRODUCT-$(date +%s)"

echo "→ POST $URL"
RESP=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-integration-secret: $SECRET" \
  -d @- <<JSON
{
  "organizationId": "$ORG",
  "product": {
    "externalId": "$EXT_ID",
    "externalSource": "api",
    "name": "API Test Product",
    "category": "adventure",
    "status": "active",
    "minPartySize": 1,
    "maxPartySize": 10,
    "durationMinutes": 60,
    "shortDescription": "Created by test-products-api.sh",
    "variants": [
      { "externalId": "VAR-default", "name": "Standard", "sortOrder": 0 }
    ],
    "inclusions": [
      { "label": "Guide included", "inclusionType": "included", "sortOrder": 0 }
    ]
  }
}
JSON
)

BODY=$(echo "$RESP" | sed '$d')
CODE=$(echo "$RESP" | tail -1 | cut -d: -f2)

echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo "Status: $CODE"

if [ "$CODE" != "200" ]; then
  echo "❌ Product sync failed"
  exit 1
fi

echo "✅ Product sync OK (externalId: $EXT_ID)"
echo "   Check Agent → Products and Team → Products in the portal."
