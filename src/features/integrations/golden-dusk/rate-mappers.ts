import type {
  ExternalRatePlanItemPayload,
  ExternalRatePlanPayload,
} from "@/features/integrations/catalog/types";
import {
  GOLDEN_DUSK_ACCOMMODATION_PREFIX,
  GOLDEN_DUSK_ACTIVITY_PREFIX,
  GOLDEN_DUSK_RATE_PLAN_PREFIX,
  type GoldenDuskProductPriceRate,
  type GoldenDuskProductPriceRow,
} from "./types";

const DEFAULT_AGENT_RATE_TYPES = [
  "Reseller",
  "VF - Reseller",
  "Volume Reseller",
] as const;

const SKIPPED_RATE_TYPES = new Set(["none"]);

type RateLine = {
  productExternalId: string;
  productName: string;
  adultNetRate: number;
  childNetRate: number;
  adultRack: number;
  childRack: number;
  startDate: string;
  endDate: string;
  priceRowId: number;
  rateId: number;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function productExternalId(productType: string, productId: number) {
  return productType === "Accommodation"
    ? `${GOLDEN_DUSK_ACCOMMODATION_PREFIX}${productId}`
    : `${GOLDEN_DUSK_ACTIVITY_PREFIX}${productId}`;
}

function parseDate(value: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isActiveOnDate(startDate: string, endDate: string, onDate: Date) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return false;
  return onDate >= start && onDate <= end;
}

function pickPreferredRateLine(
  current: RateLine | undefined,
  candidate: RateLine,
  onDate: Date,
): RateLine {
  if (!current) return candidate;

  const currentActive = isActiveOnDate(
    current.startDate,
    current.endDate,
    onDate,
  );
  const candidateActive = isActiveOnDate(
    candidate.startDate,
    candidate.endDate,
    onDate,
  );

  if (candidateActive && !currentActive) return candidate;
  if (currentActive && !candidateActive) return current;

  const currentStart = parseDate(current.startDate)?.getTime() ?? 0;
  const candidateStart = parseDate(candidate.startDate)?.getTime() ?? 0;
  return candidateStart >= currentStart ? candidate : current;
}

function collectRateLines(rows: GoldenDuskProductPriceRow[]) {
  const buckets = new Map<string, Map<string, RateLine>>();

  for (const row of rows) {
    const rates =
      row.activityProductPriceRates ??
      row.accommodationProductPriceRates ??
      [];

    for (const rate of rates) {
      if (rate.isDeleted) continue;
      const rateTypeName = rate.rateTypeName?.trim();
      if (!rateTypeName || SKIPPED_RATE_TYPES.has(rateTypeName.toLowerCase())) {
        continue;
      }

      const productId = productExternalId(row.productType, row.productId);
      const line: RateLine = {
        productExternalId: productId,
        productName: row.productName,
        adultNetRate: rate.adultNetRate,
        childNetRate: rate.childNetRate,
        adultRack: rate.adultRack,
        childRack: rate.childRack,
        startDate: row.startDate,
        endDate: row.endDate,
        priceRowId: row.id,
        rateId: rate.id,
      };

      if (!buckets.has(rateTypeName)) {
        buckets.set(rateTypeName, new Map());
      }

      const productBucket = buckets.get(rateTypeName)!;
      const existing = productBucket.get(productId);
      productBucket.set(
        productId,
        pickPreferredRateLine(existing, line, new Date()),
      );
    }
  }

  return buckets;
}

function buildRatePlanItem(line: RateLine): ExternalRatePlanItemPayload {
  const notes =
    line.childNetRate !== line.adultNetRate
      ? `Child net ${line.childNetRate.toFixed(2)} · Rack ${line.adultRack.toFixed(2)}`
      : line.adultRack !== line.adultNetRate
        ? `Rack ${line.adultRack.toFixed(2)}`
        : null;

  return {
    productExternalId: line.productExternalId,
    pricePerPerson: line.adultNetRate,
    currency: "USD",
    notes,
  };
}

function resolveDefaultAgentRateType(rateTypeNames: string[]) {
  const available = new Set(rateTypeNames);
  for (const candidate of DEFAULT_AGENT_RATE_TYPES) {
    if (available.has(candidate)) return candidate;
  }
  return rateTypeNames[0] ?? null;
}

export function mapGoldenDuskRatePlans(input: {
  year: number;
  activities: GoldenDuskProductPriceRow[];
  accommodation: GoldenDuskProductPriceRow[];
  defaultAgentRateType?: string | null;
  knownProductExternalIds?: Set<string>;
}): ExternalRatePlanPayload[] {
  const buckets = collectRateLines([
    ...input.activities,
    ...input.accommodation,
  ]);
  const rateTypeNames = Array.from(buckets.keys()).sort();
  const defaultAgentRateType =
    input.defaultAgentRateType ??
    resolveDefaultAgentRateType(rateTypeNames);

  return rateTypeNames.map((rateTypeName) => {
    const lines = Array.from(buckets.get(rateTypeName)?.values() ?? []);
    const filteredLines = input.knownProductExternalIds
      ? lines.filter((line) =>
          input.knownProductExternalIds!.has(line.productExternalId),
        )
      : lines;

    const startDates = filteredLines
      .map((line) => parseDate(line.startDate))
      .filter((value): value is Date => value !== null);
    const endDates = filteredLines
      .map((line) => parseDate(line.endDate))
      .filter((value): value is Date => value !== null);

    const validFrom = startDates.length
      ? new Date(Math.min(...startDates.map((date) => date.getTime())))
          .toISOString()
          .slice(0, 10)
      : `${input.year}-01-01`;
    const validUntil = endDates.length
      ? new Date(Math.max(...endDates.map((date) => date.getTime())))
          .toISOString()
          .slice(0, 10)
      : `${input.year}-12-31`;

    const externalId = `${GOLDEN_DUSK_RATE_PLAN_PREFIX}${input.year}-${slugify(rateTypeName)}`;

    return {
      externalId,
      externalSource: "api",
      name: `${input.year} ${rateTypeName}`,
      description: `GoldenDusk ${rateTypeName} net rates for ${input.year}.`,
      planType:
        rateTypeName === defaultAgentRateType ? "agent_default" : "public",
      validFrom,
      validUntil,
      active: filteredLines.length > 0,
      items: filteredLines
        .sort((a, b) => a.productName.localeCompare(b.productName))
        .map(buildRatePlanItem),
      metadata: {
        goldenDusk: {
          year: input.year,
          rateTypeName,
          sourcePriceRows: filteredLines.length,
          skippedUnknownProducts: lines.length - filteredLines.length,
        },
      },
    };
  });
}

export function extractGoldenDuskRateTypes(
  rows: GoldenDuskProductPriceRow[],
): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    const rates =
      row.activityProductPriceRates ??
      row.accommodationProductPriceRates ??
      [];
    for (const rate of rates as GoldenDuskProductPriceRate[]) {
      if (rate.isDeleted) continue;
      const name = rate.rateTypeName?.trim();
      if (name && !SKIPPED_RATE_TYPES.has(name.toLowerCase())) {
        names.add(name);
      }
    }
  }
  return Array.from(names).sort();
}
