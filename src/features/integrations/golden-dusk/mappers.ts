import type { ExternalProductPayload } from "@/features/integrations/catalog/types";
import type {
  GoldenDuskAccommodationProduct,
  GoldenDuskActivityProduct,
} from "./types";
import {
  GOLDEN_DUSK_ACCOMMODATION_PREFIX,
  GOLDEN_DUSK_ACTIVITY_PREFIX,
} from "./types";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function positiveInt(value: number | null | undefined, fallback = 1) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function normalizePartySize(minPax: number, maxPax: number) {
  const minPartySize = positiveInt(minPax);
  const rawMax = positiveInt(maxPax, minPartySize);
  const maxPartySize = Math.max(minPartySize, rawMax);
  return { minPartySize, maxPartySize };
}

function mapActivityCategory(
  product: GoldenDuskActivityProduct,
): NonNullable<ExternalProductPayload["category"]> {
  const text =
    `${product.productSubCategoryName ?? ""} ${product.productCategoryName ?? ""} ${product.name}`.toLowerCase();

  if (text.includes("transfer")) return "transfer";
  if (
    text.includes("cruise") ||
    text.includes("raft") ||
    text.includes("boat") ||
    text.includes("jetty")
  ) {
    return "water";
  }
  if (
    text.includes("flight") ||
    text.includes("helicopter") ||
    text.includes("scenic")
  ) {
    return "scenic";
  }
  if (
    text.includes("tour") ||
    text.includes("village") ||
    text.includes("cultural")
  ) {
    return "cultural";
  }
  if (
    text.includes("combo") ||
    text.includes("package") ||
    text.includes("spectecular") ||
    text.includes("spectacular")
  ) {
    return "multi_activity";
  }

  return "adventure";
}

function buildInclusions(input: {
  hasBreakfast?: boolean;
  dropOffName?: string | null;
}) {
  const inclusions: ExternalProductPayload["inclusions"] = [];
  let sortOrder = 0;

  if (input.hasBreakfast) {
    inclusions.push({
      label: "Breakfast included",
      inclusionType: "included",
      sortOrder: sortOrder++,
    });
  }

  if (input.dropOffName?.trim()) {
    inclusions.push({
      label: `Pickup / drop-off: ${input.dropOffName.trim()}`,
      inclusionType: "included",
      sortOrder: sortOrder++,
    });
  }

  return inclusions.length ? inclusions : undefined;
}

export function mapAccommodationProduct(
  product: GoldenDuskAccommodationProduct,
): ExternalProductPayload {
  const externalId = `${GOLDEN_DUSK_ACCOMMODATION_PREFIX}${product.id}`;
  const variantName = product.roomType?.trim() || "Standard";
  const { minPartySize, maxPartySize } = normalizePartySize(
    product.minPax,
    product.maxPax,
  );

  return {
    externalId,
    externalSource: "api",
    name: product.name.trim(),
    slug: slugify(`${product.code}-${product.name}`),
    shortDescription: product.description?.trim() || null,
    fullDescription: product.description?.trim() || null,
    category: "accommodation",
    status: product.isAvailable ? "active" : "draft",
    minPartySize,
    maxPartySize,
    durationMinutes: null,
    variants: [
      {
        externalId: product.code,
        name: variantName,
        description: product.accommodationType?.trim() || null,
        sortOrder: 0,
        active: product.isAvailable,
      },
    ],
    inclusions: buildInclusions({
      hasBreakfast: product.hasBreakfast,
      dropOffName: product.dropOffName,
    }),
    metadata: {
      goldenDusk: {
        kind: "accommodation",
        id: product.id,
        code: product.code,
        roomType: product.roomType,
        accommodationType: product.accommodationType,
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        productSubCategoryName: product.productSubCategoryName,
        dropOffName: product.dropOffName,
        isTaxable: product.isTaxable,
      },
    },
  };
}

export function mapActivityProduct(
  product: GoldenDuskActivityProduct,
): ExternalProductPayload {
  const externalId = `${GOLDEN_DUSK_ACTIVITY_PREFIX}${product.id}`;
  const durationMinutes = product.durationInMinutes
    ? positiveInt(product.durationInMinutes)
    : null;
  const { minPartySize, maxPartySize } = normalizePartySize(
    product.minPax,
    product.maxPax,
  );

  return {
    externalId,
    externalSource: "api",
    name: product.name.trim(),
    slug: slugify(`${product.code}-${product.name}`),
    shortDescription: product.description?.trim() || null,
    fullDescription: product.description?.trim() || null,
    category: mapActivityCategory(product),
    status: product.isAvailable ? "active" : "draft",
    minPartySize,
    maxPartySize,
    durationMinutes,
    variants: [
      {
        externalId: product.code,
        name: "Standard",
        description: product.productSubCategoryName,
        sortOrder: 0,
        active: product.isAvailable,
      },
    ],
    inclusions: buildInclusions({ dropOffName: product.dropOffName }),
    metadata: {
      goldenDusk: {
        kind: "activity",
        id: product.id,
        code: product.code,
        supplierId: product.supplierId,
        supplierName: product.supplierName,
        productSubCategoryName: product.productSubCategoryName,
        dropOffName: product.dropOffName,
        timesPerDay: product.timesPerDay,
        isTaxable: product.isTaxable,
      },
    },
  };
}
