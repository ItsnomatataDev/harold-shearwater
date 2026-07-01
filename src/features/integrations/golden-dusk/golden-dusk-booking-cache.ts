import "server-only";

import type { GoldenDuskReservation } from "./agent-booking-types";

const CACHE_TTL_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  data: GoldenDuskReservation[];
};

const bookingsCache = new Map<string, CacheEntry>();
const inflightLoads = new Map<string, Promise<GoldenDuskReservation[]>>();

export function invalidateGoldenDuskBookingsCache(membershipId: string) {
  bookingsCache.delete(membershipId);
  inflightLoads.delete(membershipId);
}

export async function getGoldenDuskBookingsCached(
  membershipId: string,
  loader: () => Promise<GoldenDuskReservation[]>,
  options?: { refresh?: boolean },
): Promise<GoldenDuskReservation[]> {
  if (options?.refresh) {
    invalidateGoldenDuskBookingsCache(membershipId);
  }

  const cached = bookingsCache.get(membershipId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pending = inflightLoads.get(membershipId);
  if (pending) {
    return pending;
  }

  const loadPromise = loader()
    .then((data) => {
      bookingsCache.set(membershipId, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      inflightLoads.delete(membershipId);
    });

  inflightLoads.set(membershipId, loadPromise);
  return loadPromise;
}

export function getGoldenDuskBookingsCacheAgeMs(membershipId: string) {
  const cached = bookingsCache.get(membershipId);
  if (!cached) return null;
  return Math.max(0, CACHE_TTL_MS - (cached.expiresAt - Date.now()));
}
