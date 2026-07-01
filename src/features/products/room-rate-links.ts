import type { AvailabilityUnitKey } from "@/features/booking/availability-shared";
import { ROOM_PRODUCT_EXTERNAL_PREFIX } from "@/features/booking/availability-shared";

/**
 * Maps availability room-type keys to the canonical GoldenDusk accommodation
 * product used for contracted net rates (Explorers Village inventory).
 */
export const ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS: Record<
  AvailabilityUnitKey,
  { externalId: string; label: string }
> = {
  standardTwin: {
    externalId: "ACCOM-1",
    label: "Standard Room - Twin (BnB)",
  },
  standardDouble: {
    externalId: "ACCOM-2",
    label: "Standard Room - Double (BnB)",
  },
  deluxeTwin: {
    externalId: "ACCOM-4",
    label: "Deluxe Room - Twin (BnB)",
  },
  deluxeDouble: {
    externalId: "ACCOM-5",
    label: "Deluxe Room - Double (BnB)",
  },
  domeTent: {
    externalId: "ACCOM-7",
    label: "Dome Tent - Twin",
  },
};

export function resolveRoomUnitKeyFromExternalId(
  externalId: string | null | undefined,
): AvailabilityUnitKey | null {
  if (!externalId?.startsWith(ROOM_PRODUCT_EXTERNAL_PREFIX)) return null;
  const key = externalId.slice(ROOM_PRODUCT_EXTERNAL_PREFIX.length);
  if (key in ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS) {
    return key as AvailabilityUnitKey;
  }
  return null;
}

export function resolveGoldenDuskRateExternalIdForProduct(product: {
  external_id?: string | null;
}): string | null {
  const unitKey = resolveRoomUnitKeyFromExternalId(product.external_id);
  if (!unitKey) return product.external_id ?? null;
  return ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS[unitKey].externalId;
}

export function listRoomRateLinkExternalIds(): string[] {
  return Object.values(ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS).map(
    (entry) => entry.externalId,
  );
}
