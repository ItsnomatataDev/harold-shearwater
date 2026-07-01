export type CatalogExternalSource = "manual" | "activitar" | "api";

export type CatalogSyncStatus = "manual" | "pending" | "synced" | "error";

export interface ExternalProductVariantPayload {
  /** Stable variant id/code from the products API. Rates should reference this. */
  externalId?: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export interface ExternalProductInclusionPayload {
  label: string;
  inclusionType?: "included" | "excluded" | "requirement" | "restriction";
  sortOrder?: number;
}

export interface ExternalProductPayload {
  externalId: string;
  externalSource?: CatalogExternalSource;
  name: string;
  slug?: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  category?:
    | "adventure"
    | "scenic"
    | "water"
    | "cultural"
    | "multi_activity"
    | "transfer"
    | "accommodation";
  status?: "draft" | "active" | "archived";
  minPartySize?: number;
  maxPartySize?: number | null;
  durationMinutes?: number | null;
  coverImageUrl?: string | null;
  variants?: ExternalProductVariantPayload[];
  inclusions?: ExternalProductInclusionPayload[];
  metadata?: Record<string, unknown>;
}

export interface ExternalRatePlanItemPayload {
  /** Must match ExternalProductPayload.externalId from the products API. */
  productExternalId: string;
  /** Must match ExternalProductVariantPayload.externalId when variant pricing is used. */
  variantExternalId?: string | null;
  pricePerPerson: number;
  currency?: string;
  notes?: string | null;
}

export interface ExternalRatePlanPayload {
  externalId: string;
  externalSource?: CatalogExternalSource;
  name: string;
  description?: string | null;
  planType?:
    | "public"
    | "agent_default"
    | "agency_specific"
    | "staff"
    | "promotional";
  validFrom?: string | null;
  validUntil?: string | null;
  active?: boolean;
  items?: ExternalRatePlanItemPayload[];
  /** Agent company external IDs that should receive this contracted rate plan. */
  agencyExternalIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface ExternalAgencyPayload {
  externalId: string;
  externalSource?: CatalogExternalSource;
  name: string;
  slug?: string;
  timezone?: string;
  active?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CatalogSyncResult {
  runId: string;
  resourceType: "product" | "rate_plan" | "agency";
  externalId: string;
  internalId: string;
  status: "applied";
}
