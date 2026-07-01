import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  listRoomRateLinkExternalIds,
  ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS,
} from "@/features/products/room-rate-links";
import {
  getOperatingOrganizationId,
  getProducts,
  isRoomProduct,
} from "@/features/products/products-service";

export type CatalogLinkageIssue = {
  kind:
    | "missing_product"
    | "missing_rate"
    | "missing_room_link_product"
    | "room_without_rate";
  code: string;
  message: string;
};

export type CatalogLinkageReport = {
  products: {
    total: number;
    withRates: number;
    withoutRates: number;
  };
  ratePlans: {
    total: number;
    items: number;
    orphanedItems: number;
  };
  roomTypes: {
    total: number;
    linked: number;
    withRates: number;
  };
  issues: CatalogLinkageIssue[];
  ok: boolean;
};

export async function verifyCatalogRateLinkage(
  organizationId: string,
): Promise<CatalogLinkageReport> {
  const admin = createAdminClient() as any;
  const issues: CatalogLinkageIssue[] = [];

  const [products, ratePlansResult, rateItemsResult] = await Promise.all([
    getProducts(organizationId, undefined, { includeRooms: true }),
    admin
      .from("rate_plans")
      .select("id,name,external_id,active")
      .eq("organization_id", organizationId),
    admin
      .from("rate_plan_items")
      .select("id,product_id,price_per_person,rate_plans!inner(organization_id)")
      .eq("rate_plans.organization_id", organizationId),
  ]);

  if (ratePlansResult.error) throw new Error(ratePlansResult.error.message);
  if (rateItemsResult.error) throw new Error(rateItemsResult.error.message);

  const productById = new Map(products.map((product) => [product.id, product]));
  const catalogProducts = products.filter((product) => !isRoomProduct(product));
  const roomProducts = products.filter((product) => isRoomProduct(product));

  const productIdsWithRates = new Set<string>(
    (rateItemsResult.data ?? []).map(
      (item: { product_id: string }) => item.product_id,
    ),
  );

  let orphanedItems = 0;
  for (const item of rateItemsResult.data ?? []) {
    if (!productById.has(item.product_id)) {
      orphanedItems += 1;
      issues.push({
        kind: "missing_product",
        code: item.id,
        message: `Rate item references missing product ${item.product_id}.`,
      });
    }
  }

  const catalogWithRates = catalogProducts.filter((product) =>
    productIdsWithRates.has(product.id),
  ).length;

  for (const product of catalogProducts) {
    if (!productIdsWithRates.has(product.id) && product.external_id) {
      issues.push({
        kind: "missing_rate",
        code: product.external_id,
        message: `Catalog product "${product.name}" has no synced rate.`,
      });
    }
  }

  const linkExternalIds = listRoomRateLinkExternalIds();
  const { data: linkedProducts, error: linkedError } = await admin
    .from("products")
    .select("id,external_id,name")
    .eq("organization_id", organizationId)
    .eq("external_source", "api")
    .in("external_id", linkExternalIds);
  if (linkedError) throw new Error(linkedError.message);

  const linkedByExternalId = new Map<string, string>(
    (linkedProducts ?? []).map(
      (row: { external_id: string; id: string }) => [row.external_id, row.id] as const,
    ),
  );

  let roomLinked = 0;
  let roomWithRates = 0;

  for (const [unitKey, link] of Object.entries(
    ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS,
  )) {
    const linkedProductId = linkedByExternalId.get(link.externalId);
    if (!linkedProductId) {
      issues.push({
        kind: "missing_room_link_product",
        code: link.externalId,
        message: `Room type "${unitKey}" links to ${link.externalId}, but that product is not in the catalog.`,
      });
      continue;
    }

    roomLinked += 1;
    if (productIdsWithRates.has(linkedProductId)) {
      roomWithRates += 1;
    } else {
      issues.push({
        kind: "room_without_rate",
        code: unitKey,
        message: `Room type "${unitKey}" links to ${link.externalId}, but no rate is synced for it.`,
      });
    }
  }

  for (const room of roomProducts) {
    if (!room.external_id) continue;
    const hasDirectRate = productIdsWithRates.has(room.id);
    const unitKey = room.external_id.replace(/^ROOM-/, "");
    const link = ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS[
      unitKey as keyof typeof ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS
    ];
    const linkedId = link ? linkedByExternalId.get(link.externalId) : undefined;
    const hasLinkedRate = linkedId ? productIdsWithRates.has(linkedId) : false;
    if (!hasDirectRate && !hasLinkedRate) {
      issues.push({
        kind: "room_without_rate",
        code: room.external_id,
        message: `Availability room "${room.name}" has no direct or linked EV rate.`,
      });
    }
  }

  return {
    products: {
      total: catalogProducts.length,
      withRates: catalogWithRates,
      withoutRates: catalogProducts.length - catalogWithRates,
    },
    ratePlans: {
      total: (ratePlansResult.data ?? []).length,
      items: (rateItemsResult.data ?? []).length,
      orphanedItems,
    },
    roomTypes: {
      total: Object.keys(ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS).length,
      linked: roomLinked,
      withRates: roomWithRates,
    },
    issues,
    ok: issues.length === 0,
  };
}

export async function verifyOperatingCatalogLinkage(): Promise<CatalogLinkageReport | null> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return null;
  return verifyCatalogRateLinkage(organizationId);
}
