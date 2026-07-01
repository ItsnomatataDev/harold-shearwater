import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { upsertExternalRatePlan } from "@/features/integrations/catalog/catalog-sync-service";
import type { ExternalRatePlanPayload } from "@/features/integrations/catalog/types";
import { mapGoldenDuskRatePlans } from "./rate-mappers";
import { fetchGoldenDuskProductPrices } from "./rates-service";

export type GoldenDuskRatesSyncOptions = {
  year?: number;
  defaultAgentRateType?: string;
};

export type GoldenDuskRatesSyncItemResult = {
  externalId: string;
  name: string;
  status: "applied" | "failed" | "skipped";
  internalId?: string;
  itemCount?: number;
  error?: string;
};

export type GoldenDuskRatesSyncResult = {
  year: number;
  fetched: {
    activityPriceRows: number;
    accommodationPriceRows: number;
    ratePlans: number;
  };
  applied: number;
  failed: number;
  skipped: number;
  items: GoldenDuskRatesSyncItemResult[];
};

async function getKnownCatalogProductExternalIds(organizationId: string) {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("products")
    .select("id,external_id")
    .eq("organization_id", organizationId)
    .eq("external_source", "api")
    .not("external_id", "is", null);
  if (error) throw new Error(error.message);

  const knownIds = new Set<string>();
  const productCache = new Map<
    string,
    { id: string; name: string; external_id: string | null }
  >();

  for (const row of data ?? []) {
    if (!row.external_id) continue;
    knownIds.add(row.external_id);
    productCache.set(row.external_id, {
      id: row.id,
      name: row.external_id,
      external_id: row.external_id,
    });
  }

  return { knownIds, productCache };
}

async function syncOneRatePlan(
  organizationId: string,
  payload: ExternalRatePlanPayload,
  productCache: Map<string, { id: string; name: string; external_id: string | null }>,
): Promise<GoldenDuskRatesSyncItemResult> {
  if (!payload.items?.length) {
    return {
      externalId: payload.externalId,
      name: payload.name,
      status: "skipped",
      itemCount: 0,
      error: "No matching catalog products for this rate plan.",
    };
  }

  try {
    const result = await upsertExternalRatePlan(organizationId, payload, {
      productCache,
    });
    return {
      externalId: payload.externalId,
      name: payload.name,
      status: "applied",
      internalId: result.internalId,
      itemCount: payload.items.length,
    };
  } catch (error) {
    return {
      externalId: payload.externalId,
      name: payload.name,
      status: "failed",
      itemCount: payload.items.length,
      error: error instanceof Error ? error.message : "Rate plan sync failed.",
    };
  }
}

export async function syncGoldenDuskRates(
  organizationId: string,
  options: GoldenDuskRatesSyncOptions = {},
): Promise<GoldenDuskRatesSyncResult> {
  const [prices, catalog] = await Promise.all([
    fetchGoldenDuskProductPrices(options.year),
    getKnownCatalogProductExternalIds(organizationId),
  ]);

  const payloads = mapGoldenDuskRatePlans({
    year: prices.year,
    activities: prices.activities,
    accommodation: prices.accommodation,
    defaultAgentRateType: options.defaultAgentRateType,
    knownProductExternalIds: catalog.knownIds,
  });

  const items: GoldenDuskRatesSyncItemResult[] = [];
  for (const payload of payloads) {
    items.push(
      await syncOneRatePlan(organizationId, payload, catalog.productCache),
    );
  }

  return {
    year: prices.year,
    fetched: {
      activityPriceRows: prices.activities.length,
      accommodationPriceRows: prices.accommodation.length,
      ratePlans: payloads.length,
    },
    applied: items.filter((item) => item.status === "applied").length,
    failed: items.filter((item) => item.status === "failed").length,
    skipped: items.filter((item) => item.status === "skipped").length,
    items,
  };
}
