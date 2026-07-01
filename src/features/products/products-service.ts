import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import {
  AVAILABILITY_UNIT_TYPES,
  type AvailabilityUnitKey,
} from "@/features/booking/availability-shared";

/** Convention: room products carry external_id "ROOM-<availabilityUnitKey>". */
export const ROOM_EXTERNAL_ID_PREFIX = "ROOM-";

const VALID_UNIT_KEYS = new Set<string>(
  AVAILABILITY_UNIT_TYPES.map((unit) => unit.key),
);

export type RoomProductRef = {
  unitKey: AvailabilityUnitKey;
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string | null;
  shortDescription: string | null;
};

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  category: string;
  status: "draft" | "active" | "archived";
  min_party_size: number;
  max_party_size: number | null;
  duration_minutes: number | null;
  cover_image_url: string | null;
  external_source?: "manual" | "activitar" | "api";
  external_id?: string | null;
  sync_status?: "manual" | "pending" | "synced" | "error";
  last_synced_at?: string | null;
  sync_error?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  external_id?: string | null;
};

export type ProductInclusion = {
  id: string;
  product_id: string;
  label: string;
  inclusion_type: "included" | "excluded" | "requirement" | "restriction";
  sort_order: number;
};

export type ProductWithDetails = Product & {
  variants: ProductVariant[];
  inclusions: ProductInclusion[];
};

/** Rooms live only in the availability API; they are stored as catalog
 * products purely to back the availability page (images, detail pages). They
 * must never appear in the product catalog, which only lists activities synced
 * from the products API. */
export function isRoomProduct(product: Pick<Product, "external_id">): boolean {
  return product.external_id?.startsWith(ROOM_EXTERNAL_ID_PREFIX) === true;
}

export async function getProducts(
  organizationId: string,
  status?: "draft" | "active" | "archived",
  options?: { includeRooms?: boolean },
): Promise<Product[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingDatabaseObject(error)) return [];
    throw error;
  }
  const products = (data ?? []) as Product[];
  if (options?.includeRooms) return products;
  return products.filter((product) => !isRoomProduct(product));
}

export async function getCatalogUsageSummary(organizationId: string) {
  const allProducts = await getProducts(organizationId);

  return {
    totalProducts: allProducts.length,
    activeProducts: allProducts.filter((product) => product.status === "active").length,
    syncedProducts: allProducts.filter((product) => product.sync_status === "synced").length,
    externalProducts: allProducts.filter((product) => product.external_source !== "manual").length,
    syncErrors: allProducts.filter((product) => product.sync_status === "error").length,
  };
}

export async function getProduct(
  organizationId: string,
  productId: string,
): Promise<Product | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .single();
  if (error) return null;
  return data as Product;
}

export async function getProductIdsByExternalIds(
  organizationId: string,
  externalIds: string[],
  externalSource: NonNullable<Product["external_source"]> = "api",
): Promise<Map<string, string>> {
  if (!externalIds.length) return new Map();

  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("products")
    .select("id,external_id")
    .eq("organization_id", organizationId)
    .eq("external_source", externalSource)
    .in("external_id", externalIds);
  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of (data ?? []) as { id: string; external_id: string | null }[]) {
    if (row.external_id) map.set(row.external_id, row.id);
  }
  return map;
}

export async function getProductWithDetails(
  organizationId: string,
  productId: string,
): Promise<ProductWithDetails | null> {
  const supabase = createAdminClient();
  const [productResult, variantsResult, inclusionsResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", productId)
      .single(),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
    supabase
      .from("product_inclusions")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
  ]);

  if (productResult.error || !productResult.data) return null;

  return {
    ...(productResult.data as Product),
    variants: (variantsResult.data ?? []) as ProductVariant[],
    inclusions: (inclusionsResult.data ?? []) as ProductInclusion[],
  };
}

export async function getActiveProductsByCategory(
  organizationId: string,
): Promise<Record<string, Product[]>> {
  const products = await getProducts(organizationId, "active");
  return products.reduce(
    (acc, product) => {
      if (!acc[product.category]) acc[product.category] = [];
      acc[product.category].push(product);
      return acc;
    },
    {} as Record<string, Product[]>,
  );
}

/**
 * Resolve the operating (Shearwater) organization that owns the public catalog.
 * Customers do not belong to an organization, so we look this up with the admin
 * client. This is a non-sensitive id lookup used to read the shared,
 * API-synced catalog that also powers the team and agent dashboards.
 */
export async function getOperatingOrganizationId(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select("id")
      .eq("type", "shearwater")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

/**
 * Customer-facing catalog. Reads the same active products the integration API
 * syncs into the operator organization, so prices/products stay in lock-step
 * across the team, agent and customer experiences once endpoints are connected.
 * RLS still applies via the customer read policy; this never exposes rates.
 */
export async function getCustomerCatalogByCategory(): Promise<
  Record<string, Product[]>
> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return {};
  return getActiveProductsByCategory(organizationId);
}

/**
 * Agent-facing catalog. Uses the Shearwater operator organization (not the
 * agent's agency company org) so all approved agents see the same product set.
 */
export async function getAgentCatalogByCategory(): Promise<
  Record<string, Product[]>
> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return {};
  return getActiveProductsByCategory(organizationId);
}

/**
 * Single product (with variants and inclusions) from the operator catalog.
 * Used by the agent and customer product detail pages, both of which read the
 * same API-synced Shearwater catalog. RLS still applies on read.
 */
export async function getOperatingProductDetail(
  productId: string,
): Promise<ProductWithDetails | null> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return null;
  return getProductWithDetails(organizationId, productId);
}

/**
 * Map each availability room-type key to its catalog room product, so the
 * availability check can link each room card to its own detail page. Rooms are
 * matched by the "ROOM-<unitKey>" external_id convention used when they are
 * synced through the catalog API.
 */
export async function getAvailabilityRoomProducts(): Promise<
  Partial<Record<AvailabilityUnitKey, RoomProductRef>>
> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return {};
  const products = await getProducts(organizationId, "active", {
    includeRooms: true,
  });

  const map: Partial<Record<AvailabilityUnitKey, RoomProductRef>> = {};
  for (const product of products) {
    if (!product.external_id?.startsWith(ROOM_EXTERNAL_ID_PREFIX)) continue;
    const key = product.external_id.slice(ROOM_EXTERNAL_ID_PREFIX.length);
    if (!VALID_UNIT_KEYS.has(key)) continue;
    map[key as AvailabilityUnitKey] = {
      unitKey: key as AvailabilityUnitKey,
      id: product.id,
      name: product.name,
      slug: product.slug,
      coverImageUrl: product.cover_image_url,
      shortDescription: product.short_description,
    };
  }
  return map;
}
