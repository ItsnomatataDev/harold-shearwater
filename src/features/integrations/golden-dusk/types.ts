/** Shared envelope from SWAIBMS list endpoints. */
export interface GoldenDuskApiResponse<T> {
  isSuccess: boolean;
  message: string;
  time: string;
  data: T[];
}

export interface GoldenDuskProductCategory {
  id: number;
  name: string;
  productType: string;
  description?: string | null;
}

export interface GoldenDuskAccommodationProduct {
  id: number;
  code: string;
  name: string;
  description: string | null;
  roomType: string | null;
  accommodationType: string | null;
  supplierId: number;
  supplierName: string | null;
  dropOffName: string | null;
  minPax: number;
  maxPax: number;
  hasBreakfast: boolean;
  isTaxable: boolean;
  isTaxMandatory: boolean;
  isAvailable: boolean;
  productType: string;
  productCategoryId: number;
  productCategoryName: string | null;
  productSubCategoryId: number;
  productSubCategoryName: string | null;
  unitOfMeasureName: string | null;
  productCategory?: GoldenDuskProductCategory | null;
}

export interface GoldenDuskActivityProduct {
  id: number;
  code: string;
  name: string;
  description: string | null;
  durationInMinutes: number | null;
  timesPerDay: number | null;
  dropOffId: number | null;
  dropOffName: string | null;
  supplierId: number;
  supplierName: string | null;
  minPax: number;
  maxPax: number;
  isTaxable: boolean;
  isTaxMandatory: boolean;
  isAvailable: boolean;
  productType: string;
  productCategoryId: number;
  productCategoryName: string | null;
  productSubCategoryId: number;
  productSubCategoryName: string | null;
  unitOfMeasureName: string | null;
  productCategory?: GoldenDuskProductCategory | null;
}

export const GOLDEN_DUSK_ACCOMMODATION_PREFIX = "ACCOM-";
export const GOLDEN_DUSK_ACTIVITY_PREFIX = "ACTIVITY-";
export const GOLDEN_DUSK_RATE_PLAN_PREFIX = "GD-RATE-";

export interface GoldenDuskProductPriceRate {
  id: number;
  productPriceId: number;
  rateTypeId: number;
  rateTypeName: string;
  adultRack: number;
  childRack: number;
  adultNetRate: number;
  childNetRate: number;
  isDeleted?: boolean;
}

export interface GoldenDuskProductPriceRow {
  id: number;
  productId: number;
  productName: string;
  productType: string;
  productCategoryName: string | null;
  productSubCategoryName: string | null;
  supplierId: number;
  startDate: string;
  endDate: string;
  rackRate: number;
  activityProductPriceRates?: GoldenDuskProductPriceRate[];
  accommodationProductPriceRates?: GoldenDuskProductPriceRate[];
}
