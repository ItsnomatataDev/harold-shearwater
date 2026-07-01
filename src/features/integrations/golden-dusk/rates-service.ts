import "server-only";

import { goldenDuskFetch } from "./client";
import type { GoldenDuskProductPriceRow } from "./types";

export function getGoldenDuskRatesYear(year?: number) {
  const configured = process.env.GOLDEN_DUSK_RATES_YEAR?.trim();
  if (configured) {
    const parsed = Number(configured);
    if (Number.isFinite(parsed) && parsed > 2000) return Math.floor(parsed);
  }
  return year ?? new Date().getFullYear();
}

export async function fetchGoldenDuskActivityProductPrices(year?: number) {
  const ratesYear = getGoldenDuskRatesYear(year);
  const response = await goldenDuskFetch<GoldenDuskProductPriceRow>(
    `/getAllActivityProductPrices/${ratesYear}`,
  );
  return { year: ratesYear, rows: response.data };
}

export async function fetchGoldenDuskAccommodationProductPrices(year?: number) {
  const ratesYear = getGoldenDuskRatesYear(year);
  const response = await goldenDuskFetch<GoldenDuskProductPriceRow>(
    `/getAllAccommodationProductPrices/${ratesYear}`,
  );
  return { year: ratesYear, rows: response.data };
}

export async function fetchGoldenDuskProductPrices(year?: number) {
  const [activities, accommodation] = await Promise.all([
    fetchGoldenDuskActivityProductPrices(year),
    fetchGoldenDuskAccommodationProductPrices(year),
  ]);

  return {
    year: activities.year,
    activities: activities.rows,
    accommodation: accommodation.rows,
  };
}
