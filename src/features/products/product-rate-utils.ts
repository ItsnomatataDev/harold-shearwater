import type { RatePlanWithItems } from "./rate-plans-service";

export type ProductDetailRate = {
  planName: string;
  price: number;
  currency: string;
  notes: string | null;
  sourceLabel?: string | null;
};

export type AvailabilityRoomRateHint = {
  currency: string;
  price: number;
  planName: string;
};

export function buildDetailRatesForProductIds(
  ratePlans: RatePlanWithItems[],
  productIds: string[],
  sourceLabel?: string | null,
): ProductDetailRate[] {
  const idSet = new Set(productIds);
  const directId = productIds[0];

  return ratePlans.flatMap((plan) =>
    plan.items
      .filter((item) => idSet.has(item.product_id))
      .map((item) => ({
        planName: plan.name,
        price: item.price_per_person,
        currency: item.currency,
        notes: item.notes,
        sourceLabel:
          item.product_id !== directId && sourceLabel
            ? `Linked EV rate · ${sourceLabel}`
            : null,
      })),
  );
}

export function pickPreferredAgentRate(
  ratePlans: RatePlanWithItems[],
  productIds: string[],
): AvailabilityRoomRateHint | null {
  const idSet = new Set(productIds);
  const orderedPlans = [
    ...ratePlans.filter((plan) => plan.plan_type === "agent_default"),
    ...ratePlans.filter((plan) => plan.plan_type !== "agent_default"),
  ];

  for (const plan of orderedPlans) {
    const match = plan.items
      .filter((item) => idSet.has(item.product_id))
      .sort((a, b) => a.price_per_person - b.price_per_person)[0];
    if (match) {
      return {
        currency: match.currency,
        price: match.price_per_person,
        planName: plan.name,
      };
    }
  }

  return null;
}
