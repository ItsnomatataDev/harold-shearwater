
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
SECRET="${INTEGRATION_API_SECRET:-dev_catalog_secret}"
ORG="00000000-0000-4000-8000-000000000001"
URL="$BASE/api/integrations/catalog/products"

post_room () {
  local external_id="$1" name="$2" variant="$3" image="$4" short="$5" full="$6"
  curl -s -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "x-integration-secret: $SECRET" \
    -d @- <<JSON
{
  "organizationId": "$ORG",
  "product": {
    "externalId": "$external_id",
    "externalSource": "api",
    "name": "$name",
    "category": "accommodation",
    "status": "active",
    "minPartySize": 1,
    "maxPartySize": 2,
    "coverImageUrl": "$image",
    "shortDescription": "$short",
    "fullDescription": "$full",
    "variants": [{ "name": "$variant" }],
    "inclusions": [
      { "label": "Complimentary Wi-Fi", "inclusionType": "included", "sortOrder": 0 },
      { "label": "Breakfast included", "inclusionType": "included", "sortOrder": 1 },
      { "label": "En-suite bathroom", "inclusionType": "included", "sortOrder": 2 },
      { "label": "Daily housekeeping", "inclusionType": "included", "sortOrder": 3 },
      { "label": "Air conditioning", "inclusionType": "included", "sortOrder": 4 },
      { "label": "Check-in from 14:00", "inclusionType": "requirement", "sortOrder": 0 },
      { "label": "Check-out by 10:00", "inclusionType": "requirement", "sortOrder": 1 }
    ]
  }
}
JSON
  echo
}

post_room "ROOM-standardTwin" "Standard Twin Room" "Standard Twin" \
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80" \
  "Two single beds, en-suite bathroom and garden views." \
  "Our Standard Twin offers two comfortable single beds, ideal for friends or colleagues. Includes en-suite bathroom, air conditioning, complimentary Wi-Fi and daily breakfast."

post_room "ROOM-standardDouble" "Standard Double Room" "Standard Double" \
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80" \
  "One double bed, en-suite bathroom and cozy furnishings." \
  "The Standard Double features a comfortable double bed in a warm, relaxing setting. Includes en-suite bathroom, air conditioning, complimentary Wi-Fi and daily breakfast."

post_room "ROOM-deluxeTwin" "Deluxe Twin Room" "Deluxe Twin" \
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&q=80" \
  "Spacious twin room with premium finishes and a seating area." \
  "Our Deluxe Twin offers extra space, two premium single beds and a private seating area. Includes en-suite bathroom, air conditioning, complimentary Wi-Fi and daily breakfast."

post_room "ROOM-deluxeDouble" "Deluxe Double Room" "Deluxe Double" \
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80" \
  "Premium double room with king bed and lounge area." \
  "The Deluxe Double features a luxurious king bed, elegant furnishings and a comfortable lounge area. Includes en-suite bathroom, air conditioning, complimentary Wi-Fi and daily breakfast."

post_room "ROOM-domeTent" "Dome Tent" "Dome Tent" \
  "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=80" \
  "Unique glamping dome with an immersive bush experience." \
  "Sleep under the stars in our signature Dome Tent. A unique glamping experience with comfortable bedding, shared facilities and an unforgettable connection to the Victoria Falls wilderness."
