import { describe, expect, it } from "vitest";
import {
  resolveGoldenDuskRateExternalIdForProduct,
  resolveRoomUnitKeyFromExternalId,
} from "./room-rate-links";
import { buildDetailRatesForProductIds } from "./product-rate-utils";
import type { RatePlanWithItems } from "./rate-plans-service";

describe("room-rate-links", () => {
  it("maps ROOM products to GoldenDusk accommodation rate ids", () => {
    expect(resolveRoomUnitKeyFromExternalId("ROOM-standardTwin")).toBe(
      "standardTwin",
    );
    expect(
      resolveGoldenDuskRateExternalIdForProduct({
        external_id: "ROOM-deluxeDouble",
      }),
    ).toBe("ACCOM-5");
    expect(
      resolveGoldenDuskRateExternalIdForProduct({
        external_id: "ACTIVITY-41",
      }),
    ).toBe("ACTIVITY-41");
  });
});

describe("product-rate-utils", () => {
  it("includes linked product rates for room detail pages", () => {
    const ratePlans: RatePlanWithItems[] = [
      {
        id: "plan-1",
        organization_id: "org",
        name: "2026 Reseller",
        description: null,
        plan_type: "agent_default",
        valid_from: "2026-01-01",
        valid_until: "2026-12-31",
        active: true,
        created_at: "",
        updated_at: "",
        items: [
          {
            id: "item-1",
            rate_plan_id: "plan-1",
            product_id: "linked-accom",
            variant_id: null,
            price_per_person: 180,
            currency: "USD",
            notes: null,
            product_name: "Deluxe Room - Double (BnB)",
          },
        ],
      },
    ];

    const rates = buildDetailRatesForProductIds(
      ratePlans,
      ["room-product-id", "linked-accom"],
      "Deluxe Room - Double (BnB)",
    );

    expect(rates).toHaveLength(1);
    expect(rates[0]?.price).toBe(180);
    expect(rates[0]?.sourceLabel).toContain("Linked EV rate");
  });
});
