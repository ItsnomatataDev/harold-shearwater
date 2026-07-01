import { describe, expect, it } from "vitest";
import { mapGoldenDuskRatePlans } from "./rate-mappers";
import type { GoldenDuskProductPriceRow } from "./types";

const activityPriceRow: GoldenDuskProductPriceRow = {
  id: 1195,
  productId: 41,
  productName: "Sunset Cruise",
  productType: "Activity",
  productCategoryName: "Activities",
  productSubCategoryName: "Sunset Cruise",
  supplierId: 1,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  rackRate: 141,
  activityProductPriceRates: [
    {
      id: 2167,
      productPriceId: 1195,
      rateTypeId: 1,
      rateTypeName: "Reseller",
      adultRack: 141,
      childRack: 120,
      adultNetRate: 113,
      childNetRate: 95,
    },
    {
      id: 2168,
      productPriceId: 1195,
      rateTypeId: 2,
      rateTypeName: "Groups",
      adultRack: 141,
      childRack: 120,
      adultNetRate: 99,
      childNetRate: 85,
    },
  ],
};

const accommodationPriceRow: GoldenDuskProductPriceRow = {
  id: 501,
  productId: 3142,
  productName: "2 sleeper unit per night",
  productType: "Accommodation",
  productCategoryName: "Accommodation",
  productSubCategoryName: "Third Party Accommodation",
  supplierId: 8779,
  startDate: "2026-05-15",
  endDate: "2026-12-31",
  rackRate: 220,
  accommodationProductPriceRates: [
    {
      id: 9001,
      productPriceId: 501,
      rateTypeId: 1,
      rateTypeName: "Reseller",
      adultRack: 220,
      childRack: 220,
      adultNetRate: 180,
      childNetRate: 180,
    },
  ],
};

describe("golden-dusk rate mappers", () => {
  it("builds one rate plan per GoldenDusk rate type", () => {
    const plans = mapGoldenDuskRatePlans({
      year: 2026,
      activities: [activityPriceRow],
      accommodation: [accommodationPriceRow],
      knownProductExternalIds: new Set(["ACTIVITY-41", "ACCOM-3142"]),
    });

    expect(plans).toHaveLength(2);
    const reseller = plans.find((plan) => plan.name === "2026 Reseller");
    expect(reseller?.planType).toBe("agent_default");
    expect(reseller?.externalId).toBe("GD-RATE-2026-reseller");
    expect(reseller?.items).toHaveLength(2);
    expect(reseller?.items?.[0]?.productExternalId).toMatch(
      /^(ACTIVITY|ACCOM)-/,
    );
  });

  it("skips products that are not in the local catalog", () => {
    const plans = mapGoldenDuskRatePlans({
      year: 2026,
      activities: [activityPriceRow],
      accommodation: [],
      knownProductExternalIds: new Set(["ACTIVITY-999"]),
    });

    const reseller = plans.find((plan) => plan.name === "2026 Reseller");
    expect(reseller?.items).toHaveLength(0);
    expect(reseller?.metadata?.goldenDusk).toMatchObject({
      skippedUnknownProducts: 1,
    });
  });
});
