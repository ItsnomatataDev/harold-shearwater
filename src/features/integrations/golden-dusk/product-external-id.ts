import {
  GOLDEN_DUSK_ACCOMMODATION_PREFIX,
  GOLDEN_DUSK_ACTIVITY_PREFIX,
} from "./types";

export function isGoldenDuskActivityProduct(product: {
  external_id?: string | null;
}): boolean {
  return product.external_id?.startsWith(GOLDEN_DUSK_ACTIVITY_PREFIX) === true;
}

export function isGoldenDuskAccommodationProduct(product: {
  external_id?: string | null;
}): boolean {
  return (
    product.external_id?.startsWith(GOLDEN_DUSK_ACCOMMODATION_PREFIX) === true
  );
}

export function isGoldenDuskBookableProduct(product: {
  external_id?: string | null;
}): boolean {
  return (
    isGoldenDuskActivityProduct(product) ||
    isGoldenDuskAccommodationProduct(product)
  );
}

function parseGoldenDuskPrefixedId(
  externalId: string | null | undefined,
  prefix: string,
): number | null {
  if (!externalId?.startsWith(prefix)) return null;
  const id = Number(externalId.slice(prefix.length));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function parseGoldenDuskActivityId(
  externalId: string | null | undefined,
): number | null {
  return parseGoldenDuskPrefixedId(externalId, GOLDEN_DUSK_ACTIVITY_PREFIX);
}

export function parseGoldenDuskAccommodationId(
  externalId: string | null | undefined,
): number | null {
  return parseGoldenDuskPrefixedId(
    externalId,
    GOLDEN_DUSK_ACCOMMODATION_PREFIX,
  );
}

export function parseGoldenDuskProductId(
  externalId: string | null | undefined,
): { productType: "Activity" | "Accommodation"; productId: number } | null {
  const activityId = parseGoldenDuskActivityId(externalId);
  if (activityId) return { productType: "Activity", productId: activityId };
  const accommodationId = parseGoldenDuskAccommodationId(externalId);
  if (accommodationId) {
    return { productType: "Accommodation", productId: accommodationId };
  }
  return null;
}
