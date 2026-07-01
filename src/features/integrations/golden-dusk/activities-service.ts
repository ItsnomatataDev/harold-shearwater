import "server-only";

import { goldenDuskFetch } from "./client";
import { mapActivityProduct } from "./mappers";
import type { GoldenDuskActivityProduct } from "./types";

export async function fetchGoldenDuskActivityProducts(options?: {
  availableOnly?: boolean;
}) {
  const path = options?.availableOnly
    ? "/getAvailableActivityProducts"
    : "/getAllActivityProducts";
  const response = await goldenDuskFetch<GoldenDuskActivityProduct>(path);
  return response.data;
}

export async function fetchGoldenDuskActivityCatalogPayloads(options?: {
  availableOnly?: boolean;
}) {
  const products = await fetchGoldenDuskActivityProducts(options);
  return products.map(mapActivityProduct);
}
