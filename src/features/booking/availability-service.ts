import "server-only";

import {
  AVAILABILITY_UNIT_TYPES,
  type AvailabilityDay,
  type AvailabilityResult,
  type AvailabilityUnitKey,
} from "./availability-shared";

export {
  AVAILABILITY_UNIT_TYPES,
  getProductAvailabilityUnits,
  productSupportsAvailabilityCheck,
  resolveAvailabilityUnitKey,
} from "./availability-shared";
export type {
  AvailabilityDay,
  AvailabilityResult,
  AvailabilityUnitKey,
} from "./availability-shared";

const DEFAULT_AVAILABILITY_API_URL =
  "https://swagoldendusk.xyz/api/availability";

function coerceCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function normalizeDay(raw: Record<string, unknown>): AvailabilityDay {
  const units = {} as Record<AvailabilityUnitKey, number>;
  for (const unit of AVAILABILITY_UNIT_TYPES) {
    units[unit.key] = coerceCount(raw[unit.key]);
  }
  return {
    date: String(raw.date ?? ""),
    units,
  };
}

/**
 * Fetch availability from the external source for an inclusive date range and
 * return it in a normalized, render-friendly shape. Never throws on an empty
 * range — an empty `days` array simply means nothing was returned.
 */
export async function fetchAvailability(
  startDate: string,
  endDate: string,
): Promise<AvailabilityResult> {
  const baseUrl =
    process.env.AVAILABILITY_API_URL?.trim() || DEFAULT_AVAILABILITY_API_URL;
  const url = `${baseUrl}?startDate=${encodeURIComponent(
    startDate,
  )}&endDate=${encodeURIComponent(endDate)}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    // Availability changes through the day; cache briefly to stay responsive
    // without hammering the source on every keystroke/search.
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(
      `The availability service is unavailable right now (status ${response.status}).`,
    );
  }

  const raw = (await response.json().catch(() => null)) as unknown;
  const days = Array.isArray(raw)
    ? raw
        .filter(
          (entry): entry is Record<string, unknown> =>
            !!entry && typeof entry === "object",
        )
        .map(normalizeDay)
        .filter((day) => day.date)
    : [];

  return {
    startDate,
    endDate,
    days,
    unitTypes: AVAILABILITY_UNIT_TYPES.map((unit) => ({ ...unit })),
  };
}
