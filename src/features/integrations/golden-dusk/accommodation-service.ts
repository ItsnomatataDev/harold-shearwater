import "server-only";

import { goldenDuskFetch } from "./client";
import { mapAccommodationProduct } from "./mappers";
import type { GoldenDuskAccommodationProduct } from "./types";

export async function fetchGoldenDuskAccommodationProducts() {
  const response = await goldenDuskFetch<GoldenDuskAccommodationProduct>(
    "/getAllAccommodationProducts",
  );
  return response.data;
}

export async function fetchGoldenDuskAccommodationCatalogPayloads() {
  const products = await fetchGoldenDuskAccommodationProducts();
  return products.map(mapAccommodationProduct);
}
