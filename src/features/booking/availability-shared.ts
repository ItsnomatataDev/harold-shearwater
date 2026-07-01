/**
 * Client-safe availability types, unit mapping, and pure helpers. This module
 * must NOT import "server-only" — it is used by client components (booking
 * panel, availability check) as well as server code. The actual network fetch
 * lives in availability-service.ts (server-only).
 */

/**
 * Stable unit-type keys returned by the external availability source. These map
 * 1:1 to the JSON fields the API returns per day. Labels live here so the UI
 * stays generic and so a future catalog link (each key -> a product variant via
 * external_id) can be added without touching the rendering layer.
 */
export const AVAILABILITY_UNIT_TYPES = [
  { key: "standardTwin", label: "Standard Twin" },
  { key: "standardDouble", label: "Standard Double" },
  { key: "deluxeTwin", label: "Deluxe Twin" },
  { key: "deluxeDouble", label: "Deluxe Double" },
  { key: "domeTent", label: "Dome Tent" },
] as const;

export type AvailabilityUnitKey =
  (typeof AVAILABILITY_UNIT_TYPES)[number]["key"];

const LABEL_TO_KEY = new Map<string, AvailabilityUnitKey>(
  AVAILABILITY_UNIT_TYPES.flatMap((unit) => [
    [unit.key.toLowerCase(), unit.key],
    [unit.label.toLowerCase().replace(/\s+/g, ""), unit.key],
    [unit.label.toLowerCase(), unit.key],
  ]),
);

/** Match a catalog variant name (or external label) to an availability unit key. */
export function resolveAvailabilityUnitKey(
  label: string,
): AvailabilityUnitKey | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  return (
    LABEL_TO_KEY.get(normalized) ??
    LABEL_TO_KEY.get(normalized.replace(/\s+/g, "")) ??
    null
  );
}

export function productSupportsAvailabilityCheck(product: {
  category: string;
  variants: { name: string }[];
}): boolean {
  if (product.category === "accommodation") return true;
  return product.variants.some(
    (variant) => resolveAvailabilityUnitKey(variant.name) !== null,
  );
}

export function getProductAvailabilityUnits(product: {
  category: string;
  variants: { name: string }[];
}): { key: AvailabilityUnitKey; label: string }[] {
  const fromVariants = product.variants
    .map((variant) => {
      const key = resolveAvailabilityUnitKey(variant.name);
      return key ? { key, label: variant.name } : null;
    })
    .filter((entry): entry is { key: AvailabilityUnitKey; label: string } =>
      Boolean(entry),
    );

  if (fromVariants.length) return fromVariants;
  if (product.category === "accommodation") {
    return AVAILABILITY_UNIT_TYPES.map((unit) => ({ ...unit }));
  }
  return [];
}

export interface AvailabilityDay {
  date: string;
  units: Record<AvailabilityUnitKey, number>;
}

export interface AvailabilityResult {
  startDate: string;
  endDate: string;
  days: AvailabilityDay[];
  unitTypes: { key: AvailabilityUnitKey; label: string }[];
}

/** Catalog room products synced with external_id ROOM-<unitKey>. */
export const ROOM_PRODUCT_EXTERNAL_PREFIX = "ROOM-";

export function isRoomTypeProduct(product: {
  external_id?: string | null;
}): boolean {
  return product.external_id?.startsWith(ROOM_PRODUCT_EXTERNAL_PREFIX) === true;
}

export function resolveRoomUnitKeyFromProduct(product: {
  external_id?: string | null;
  variants: { name: string }[];
}): AvailabilityUnitKey | null {
  if (product.external_id?.startsWith(ROOM_PRODUCT_EXTERNAL_PREFIX)) {
    const key = product.external_id.slice(ROOM_PRODUCT_EXTERNAL_PREFIX.length);
    if (AVAILABILITY_UNIT_TYPES.some((unit) => unit.key === key)) {
      return key as AvailabilityUnitKey;
    }
  }
  const variant = product.variants[0]?.name;
  return variant ? resolveAvailabilityUnitKey(variant) : null;
}

export const ROOM_TYPE_AVAILABILITY_NOTICE =
  "Counts show how many units are free in this room type. Shearwater assigns the exact room after your request is confirmed — we do not show individual room numbers yet.";
