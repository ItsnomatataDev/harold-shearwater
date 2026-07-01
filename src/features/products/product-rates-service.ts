import "server-only";

import type { Product } from "./products-service";
import {
  getOperatingOrganizationId,
  getProductIdsByExternalIds,
} from "./products-service";
import {
  resolveGoldenDuskRateExternalIdForProduct,
  resolveRoomUnitKeyFromExternalId,
  ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS,
} from "./room-rate-links";
import { getAgentRatePlans } from "./rate-plans-service";
import type { AvailabilityUnitKey } from "@/features/booking/availability-shared";
import {
  buildDetailRatesForProductIds,
  pickPreferredAgentRate,
  type AvailabilityRoomRateHint,
  type ProductDetailRate,
} from "./product-rate-utils";

export type { AvailabilityRoomRateHint, ProductDetailRate };
export { buildDetailRatesForProductIds, pickPreferredAgentRate };

async function resolveRateTargetProductIds(
  organizationId: string,
  product: Pick<Product, "id" | "external_id">,
): Promise<{ productIds: string[]; sourceLabel: string | null }> {
  const productIds = new Set<string>([product.id]);
  let sourceLabel: string | null = null;

  const rateExternalId = resolveGoldenDuskRateExternalIdForProduct(product);
  if (
    rateExternalId &&
    rateExternalId !== product.external_id &&
    product.external_id?.startsWith("ROOM-")
  ) {
    const linkedIds = await getProductIdsByExternalIds(organizationId, [
      rateExternalId,
    ]);
    const linkedId = linkedIds.get(rateExternalId);
    if (linkedId) {
      productIds.add(linkedId);
      const unitKey = resolveRoomUnitKeyFromExternalId(product.external_id);
      sourceLabel = unitKey
        ? ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS[unitKey].label
        : rateExternalId;
    }
  }

  return {
    productIds: Array.from(productIds),
    sourceLabel,
  };
}

export async function getDetailRatesForProduct(
  membershipId: string,
  product: Pick<Product, "id" | "external_id" | "name">,
): Promise<ProductDetailRate[]> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return [];

  const [ratePlans, targets] = await Promise.all([
    getAgentRatePlans(membershipId),
    resolveRateTargetProductIds(organizationId, product),
  ]);

  return buildDetailRatesForProductIds(
    ratePlans,
    targets.productIds,
    targets.sourceLabel,
  );
}

export async function getAvailabilityRoomRateHints(
  membershipId: string,
): Promise<Partial<Record<AvailabilityUnitKey, AvailabilityRoomRateHint>>> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return {};

  const externalIds = Object.values(ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS).map(
    (entry) => entry.externalId,
  );
  const [ratePlans, productIdByExternalId] = await Promise.all([
    getAgentRatePlans(membershipId),
    getProductIdsByExternalIds(organizationId, externalIds),
  ]);

  const hints: Partial<Record<AvailabilityUnitKey, AvailabilityRoomRateHint>> =
    {};

  for (const [unitKey, link] of Object.entries(
    ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS,
  ) as [AvailabilityUnitKey, (typeof ROOM_TYPE_GOLDEN_DUSK_RATE_LINKS)[AvailabilityUnitKey]][]) {
    const productId = productIdByExternalId.get(link.externalId);
    if (!productId) continue;

    const hint = pickPreferredAgentRate(ratePlans, [productId]);
    if (hint) hints[unitKey] = hint;
  }

  return hints;
}
