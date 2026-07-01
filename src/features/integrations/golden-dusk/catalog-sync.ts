import "server-only";

import { upsertExternalProduct } from "@/features/integrations/catalog/catalog-sync-service";
import type { ExternalProductPayload } from "@/features/integrations/catalog/types";
import { fetchGoldenDuskAccommodationCatalogPayloads } from "./accommodation-service";
import { fetchGoldenDuskActivityCatalogPayloads } from "./activities-service";

export type GoldenDuskCatalogSyncOptions = {
  includeAccommodation?: boolean;
  includeActivities?: boolean;
  /** When true, only imports activities where isAvailable=true. */
  activitiesAvailableOnly?: boolean;
};

export type GoldenDuskCatalogSyncItemResult = {
  externalId: string;
  name: string;
  status: "applied" | "failed";
  internalId?: string;
  error?: string;
};

export type GoldenDuskCatalogSyncResult = {
  fetched: {
    accommodation: number;
    activities: number;
    total: number;
  };
  applied: number;
  failed: number;
  items: GoldenDuskCatalogSyncItemResult[];
};

async function syncOneProduct(
  organizationId: string,
  payload: ExternalProductPayload,
): Promise<GoldenDuskCatalogSyncItemResult> {
  try {
    const result = await upsertExternalProduct(organizationId, payload);
    return {
      externalId: payload.externalId,
      name: payload.name,
      status: "applied",
      internalId: result.internalId,
    };
  } catch (error) {
    return {
      externalId: payload.externalId,
      name: payload.name,
      status: "failed",
      error: error instanceof Error ? error.message : "Sync failed.",
    };
  }
}

async function syncPayloads(
  organizationId: string,
  payloads: ExternalProductPayload[],
  concurrency = 8,
): Promise<GoldenDuskCatalogSyncItemResult[]> {
  const results = new Array<GoldenDuskCatalogSyncItemResult>(payloads.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < payloads.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await syncOneProduct(organizationId, payloads[index]!);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, payloads.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

export async function syncGoldenDuskCatalog(
  organizationId: string,
  options: GoldenDuskCatalogSyncOptions = {},
): Promise<GoldenDuskCatalogSyncResult> {
  const includeAccommodation = options.includeAccommodation ?? true;
  const includeActivities = options.includeActivities ?? true;
  const activitiesAvailableOnly = options.activitiesAvailableOnly ?? true;

  const [accommodationPayloads, activityPayloads] = await Promise.all([
    includeAccommodation
      ? fetchGoldenDuskAccommodationCatalogPayloads()
      : Promise.resolve([]),
    includeActivities
      ? fetchGoldenDuskActivityCatalogPayloads({ availableOnly: activitiesAvailableOnly })
      : Promise.resolve([]),
  ]);

  const payloads = [...accommodationPayloads, ...activityPayloads];
  const items = await syncPayloads(organizationId, payloads);

  const applied = items.filter((item) => item.status === "applied").length;
  const failed = items.filter((item) => item.status === "failed").length;

  return {
    fetched: {
      accommodation: accommodationPayloads.length,
      activities: activityPayloads.length,
      total: payloads.length,
    },
    applied,
    failed,
    items,
  };
}
