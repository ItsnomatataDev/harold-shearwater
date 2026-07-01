import { describe, expect, it } from "vitest";
import { mapAccommodationProduct, mapActivityProduct } from "./mappers";
import type {
  GoldenDuskAccommodationProduct,
  GoldenDuskActivityProduct,
} from "./types";

const accommodationFixture: GoldenDuskAccommodationProduct = {
  id: 3142,
  code: "2SUPN2-GD",
  name: "2 sleeper unit per night for 2 people",
  description: "2 sleeper unit per night for 2 people",
  roomType: "DOUBLE",
  accommodationType: "StandardRoom",
  supplierId: 8779,
  supplierName: "Mwandi View",
  dropOffName: "Kasane Town",
  minPax: 1,
  maxPax: 2,
  hasBreakfast: true,
  isTaxable: false,
  isTaxMandatory: false,
  isAvailable: true,
  productType: "Accommodation",
  productCategoryId: 2,
  productCategoryName: "Accommodation",
  productSubCategoryId: 64,
  productSubCategoryName: "Third Party Accommodation",
  unitOfMeasureName: null,
};

const activityFixture: GoldenDuskActivityProduct = {
  id: 2315,
  code: "FFZG",
  name: "Adrinaline Highwire - (half day)",
  description: "Flying Fox, Zipline, Gorge Swing",
  durationInMinutes: 240,
  timesPerDay: 4,
  dropOffId: 766,
  dropOffName: "Wild Horizons Jetty",
  supplierId: 45,
  supplierName: "Wild Horizons",
  minPax: 1,
  maxPax: 12,
  isTaxable: true,
  isTaxMandatory: true,
  isAvailable: true,
  productType: "Activity",
  productCategoryId: 28,
  productCategoryName: "Third Party Activities",
  productSubCategoryId: 65,
  productSubCategoryName: "Third Party Activities",
  unitOfMeasureName: null,
};

describe("golden-dusk mappers", () => {
  it("maps accommodation products to catalog payloads", () => {
    const mapped = mapAccommodationProduct(accommodationFixture);

    expect(mapped.externalId).toBe("ACCOM-3142");
    expect(mapped.category).toBe("accommodation");
    expect(mapped.status).toBe("active");
    expect(mapped.variants?.[0]?.externalId).toBe("2SUPN2-GD");
    expect(mapped.inclusions?.some((item) => item.label.includes("Breakfast"))).toBe(
      true,
    );
  });

  it("maps activity products to catalog payloads", () => {
    const mapped = mapActivityProduct(activityFixture);

    expect(mapped.externalId).toBe("ACTIVITY-2315");
    expect(mapped.category).toBe("adventure");
    expect(mapped.durationMinutes).toBe(240);
    expect(mapped.variants?.[0]?.externalId).toBe("FFZG");
  });

  it("classifies cruise activities as water", () => {
    const mapped = mapActivityProduct({
      ...activityFixture,
      name: "Luxury Sunset Cruise",
      productSubCategoryName: "Luxury Sunset Cruise",
    });

    expect(mapped.category).toBe("water");
  });

  it("normalizes invalid party sizes from the source API", () => {
    const mapped = mapActivityProduct({
      ...activityFixture,
      minPax: 4,
      maxPax: 1,
    });

    expect(mapped.minPartySize).toBe(4);
    expect(mapped.maxPartySize).toBe(4);
  });
});
