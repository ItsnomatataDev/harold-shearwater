export { GoldenDuskApiError, getGoldenDuskApiBaseUrl, goldenDuskFetch } from "./client";
export {
  fetchGoldenDuskAccommodationProducts,
  fetchGoldenDuskAccommodationCatalogPayloads,
} from "./accommodation-service";
export {
  fetchGoldenDuskActivityProducts,
  fetchGoldenDuskActivityCatalogPayloads,
} from "./activities-service";
export { mapAccommodationProduct, mapActivityProduct } from "./mappers";
export {
  syncGoldenDuskCatalog,
  type GoldenDuskCatalogSyncOptions,
  type GoldenDuskCatalogSyncResult,
} from "./catalog-sync";
export {
  fetchGoldenDuskActivityProductPrices,
  fetchGoldenDuskAccommodationProductPrices,
  fetchGoldenDuskProductPrices,
  getGoldenDuskRatesYear,
} from "./rates-service";
export {
  mapGoldenDuskRatePlans,
  extractGoldenDuskRateTypes,
} from "./rate-mappers";
export {
  syncGoldenDuskRates,
  type GoldenDuskRatesSyncOptions,
  type GoldenDuskRatesSyncResult,
} from "./rates-sync";
export {
  GOLDEN_DUSK_ACCOMMODATION_PREFIX,
  GOLDEN_DUSK_ACTIVITY_PREFIX,
  GOLDEN_DUSK_RATE_PLAN_PREFIX,
  type GoldenDuskAccommodationProduct,
  type GoldenDuskActivityProduct,
  type GoldenDuskProductPriceRow,
} from "./types";
