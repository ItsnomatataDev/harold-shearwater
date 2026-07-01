import "server-only";

import {
  AVAILABILITY_UNIT_TYPES,
  type AvailabilityDay,
  type AvailabilityResult,
  type AvailabilityUnitKey,
} from "@/features/booking/availability-shared";
import { checkGoldenDuskAccommodationAvailability } from "./agent-booking-service";
import {
  ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS,
  resolveGoldenDuskRateExternalIdForProduct,
  resolveRoomUnitKeyFromExternalId,
} from "@/features/products/room-rate-links";
import {
  parseGoldenDuskAccommodationId,
  productUsesGoldenDuskAvailability,
} from "./product-external-id";

const MAX_SINGLE_PRODUCT_DAYS = 31;
const MAX_MULTI_UNIT_DAYS = 14;
const REQUEST_CONCURRENCY = 3;

export type GoldenDuskAvailabilityTarget = {
  unitKey: AvailabilityUnitKey;
  goldenDuskProductId: number;
  label: string;
};

function emptyUnits(): Record<AvailabilityUnitKey, number> {
  return Object.fromEntries(
    AVAILABILITY_UNIT_TYPES.map((unit) => [unit.key, 0]),
  ) as Record<AvailabilityUnitKey, number>;
}

function eachDayInRange(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }
  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function clampRange(
  startDate: string,
  endDate: string,
  maxDays: number,
): { startDate: string; endDate: string; truncated: boolean } {
  const days = eachDayInRange(startDate, endDate);
  if (days.length <= maxDays) {
    return { startDate, endDate, truncated: false };
  }
  const end = days[maxDays - 1];
  return { startDate, endDate: end, truncated: true };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await work(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function roomsAvailableFromResponse(
  response: Awaited<ReturnType<typeof checkGoldenDuskAccommodationAvailability>>,
): number {
  if (response.available === false) return 0;
  const count = response.roomsAvailable;
  return typeof count === "number" && Number.isFinite(count) && count > 0
    ? Math.floor(count)
    : response.available === true
      ? 1
      : 0;
}

export function resolveGoldenDuskAccommodationProductId(product: {
  external_id?: string | null;
}): number | null {
  const externalId = resolveGoldenDuskRateExternalIdForProduct(product);
  return parseGoldenDuskAccommodationId(externalId);
}

export function listGoldenDuskRoomTypeAvailabilityTargets(): GoldenDuskAvailabilityTarget[] {
  return AVAILABILITY_UNIT_TYPES.map((unit) => {
    const link = ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS[unit.key];
    return {
      unitKey: unit.key,
      goldenDuskProductId: parseGoldenDuskAccommodationId(link.externalId)!,
      label: link.label,
    };
  });
}

export { productUsesGoldenDuskAvailability };

export function resolveGoldenDuskAvailabilityTargets(product: {
  external_id?: string | null;
  variants: { name: string }[];
}): GoldenDuskAvailabilityTarget[] {
  const unitKey = resolveRoomUnitKeyFromExternalId(product.external_id);
  if (unitKey) {
    const link = ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS[unitKey];
    return [
      {
        unitKey,
        goldenDuskProductId: parseGoldenDuskAccommodationId(link.externalId)!,
        label: link.label,
      },
    ];
  }

  const directId = parseGoldenDuskAccommodationId(product.external_id);
  if (directId) {
    const matched = listGoldenDuskRoomTypeAvailabilityTargets().find(
      (target) => target.goldenDuskProductId === directId,
    );
    if (matched) return [matched];
    const fallbackKey = AVAILABILITY_UNIT_TYPES[0].key;
    return [
      {
        unitKey: fallbackKey,
        goldenDuskProductId: directId,
        label: product.external_id ?? "Accommodation",
      },
    ];
  }

  return listGoldenDuskRoomTypeAvailabilityTargets();
}

async function fetchDayAvailability(input: {
  membershipId: string;
  goldenDuskProductId: number;
  checkInDate: string;
  nights: number;
  rooms: number;
}) {
  const response = await checkGoldenDuskAccommodationAvailability({
    membershipId: input.membershipId,
    productId: input.goldenDuskProductId,
    checkInDate: input.checkInDate,
    nights: input.nights,
    rooms: input.rooms,
    isSplit: false,
  });
  return roomsAvailableFromResponse(response);
}

export async function fetchGoldenDuskAvailabilityRange(input: {
  membershipId: string;
  startDate: string;
  endDate: string;
  nights?: number;
  rooms?: number;
  targets?: GoldenDuskAvailabilityTarget[];
}): Promise<AvailabilityResult & { truncated?: boolean; source: "golden-dusk" }> {
  const targets =
    input.targets && input.targets.length
      ? input.targets
      : listGoldenDuskRoomTypeAvailabilityTargets();
  const nights = input.nights && input.nights > 0 ? input.nights : 1;
  const rooms = input.rooms && input.rooms > 0 ? input.rooms : 1;
  const maxDays =
    targets.length > 1 ? MAX_MULTI_UNIT_DAYS : MAX_SINGLE_PRODUCT_DAYS;
  const clamped = clampRange(input.startDate, input.endDate, maxDays);
  const dates = eachDayInRange(clamped.startDate, clamped.endDate);

  const dayMap = new Map<string, AvailabilityDay>(
    dates.map((date) => [date, { date, units: emptyUnits() }]),
  );

  const jobs = dates.flatMap((date) =>
    targets.map((target) => ({ date, target })),
  );

  await mapWithConcurrency(jobs, REQUEST_CONCURRENCY, async ({ date, target }) => {
    const count = await fetchDayAvailability({
      membershipId: input.membershipId,
      goldenDuskProductId: target.goldenDuskProductId,
      checkInDate: date,
      nights,
      rooms,
    });
    const day = dayMap.get(date);
    if (day) {
      day.units[target.unitKey] = count;
    }
  });

  const unitTypes =
    targets.length === 1
      ? [{ key: targets[0].unitKey, label: targets[0].label }]
      : AVAILABILITY_UNIT_TYPES.map((unit) => ({ ...unit }));

  return {
    startDate: clamped.startDate,
    endDate: clamped.endDate,
    days: dates.map((date) => dayMap.get(date)!),
    unitTypes,
    source: "golden-dusk",
    truncated: clamped.truncated,
  };
}

export async function fetchGoldenDuskProductAvailabilityRange(input: {
  membershipId: string;
  product: {
    external_id?: string | null;
    variants: { name: string }[];
  };
  startDate: string;
  endDate: string;
  nights?: number;
  rooms?: number;
}) {
  const targets = resolveGoldenDuskAvailabilityTargets(input.product);
  if (!targets.length) {
    throw new Error("This product is not linked to GoldenDusk accommodation.");
  }
  return fetchGoldenDuskAvailabilityRange({
    membershipId: input.membershipId,
    startDate: input.startDate,
    endDate: input.endDate,
    nights: input.nights,
    rooms: input.rooms,
    targets,
  });
}

export async function fetchGoldenDuskAllRoomTypesAvailabilityRange(input: {
  membershipId: string;
  startDate: string;
  endDate: string;
  nights?: number;
  rooms?: number;
}) {
  return fetchGoldenDuskAvailabilityRange({
    membershipId: input.membershipId,
    startDate: input.startDate,
    endDate: input.endDate,
    nights: input.nights,
    rooms: input.rooms,
    targets: listGoldenDuskRoomTypeAvailabilityTargets(),
  });
}
