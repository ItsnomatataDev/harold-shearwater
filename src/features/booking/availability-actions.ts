"use server";

import { z } from "zod";
import {
  getAuthContext,
  requireAgentContext,
} from "@/features/auth/services/auth-context";
import { GoldenDuskApiError } from "@/features/integrations/golden-dusk/client";
import {
  fetchGoldenDuskAllRoomTypesAvailabilityRange,
  fetchGoldenDuskProductAvailabilityRange,
} from "@/features/integrations/golden-dusk/golden-dusk-availability-service";
import { productUsesGoldenDuskAvailability } from "@/features/integrations/golden-dusk/product-external-id";
import { getGoldenDuskConnectionSummary } from "@/features/integrations/golden-dusk/agent-auth-service";
import { getOperatingOrganizationId, getProduct } from "@/features/products/products-service";
import {
  fetchAvailability,
  type AvailabilityResult,
} from "./availability-service";

const MAX_RANGE_DAYS = 62;
const MAX_GOLDEN_DUSK_RANGE_DAYS = 31;

const rangeSchema = z
  .object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "The end date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine(
    (value) => {
      const start = new Date(value.startDate).getTime();
      const end = new Date(value.endDate).getTime();
      const days = Math.round((end - start) / 86_400_000) + 1;
      return days <= MAX_RANGE_DAYS;
    },
    {
      message: `Please search a range of ${MAX_RANGE_DAYS} days or less.`,
      path: ["endDate"],
    },
  );

const goldenDuskRangeSchema = rangeSchema
  .extend({
    productId: z.string().uuid().optional(),
    nights: z.coerce.number().int().min(1).max(30).optional(),
    rooms: z.coerce.number().int().min(1).max(20).optional(),
  })
  .refine(
    (value) => {
      const start = new Date(value.startDate).getTime();
      const end = new Date(value.endDate).getTime();
      const days = Math.round((end - start) / 86_400_000) + 1;
      return days <= MAX_GOLDEN_DUSK_RANGE_DAYS;
    },
    {
      message: `Please search ${MAX_GOLDEN_DUSK_RANGE_DAYS} days or less for SWAIBMS availability.`,
      path: ["endDate"],
    },
  );

export type AvailabilitySearchResult = AvailabilityResult & {
  source: "public" | "golden-dusk";
  truncated?: boolean;
};

export type AvailabilitySearchResponse =
  | { ok: true; result: AvailabilitySearchResult }
  | { ok: false; error: string; notConnected?: boolean };

function mapGoldenDuskAvailabilityError(error: unknown, fallback: string) {
  if (error instanceof GoldenDuskApiError) {
    const notConnected =
      error.message.toLowerCase().includes("connect your golden dusk")
      || error.message.toLowerCase().includes("swaibms session expired");
    if (error.status === 429) {
      return {
        ok: false as const,
        error:
          "SWAIBMS is busy right now. Wait a minute and try again.",
        notConnected,
      };
    }
    return { ok: false as const, error: error.message, notConnected };
  }
  const message = error instanceof Error ? error.message : fallback;
  const notConnected =
    message.toLowerCase().includes("connect your golden dusk")
    || message.toLowerCase().includes("swaibms session expired");
  return { ok: false as const, error: message, notConnected };
}

export async function searchAvailability(
  input: unknown,
): Promise<AvailabilitySearchResponse> {
  const session = await getAuthContext();
  if (!session) {
    return { ok: false, error: "Please sign in to check availability." };
  }

  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please choose a valid date range.",
    };
  }

  try {
    const result = await fetchAvailability(
      parsed.data.startDate,
      parsed.data.endDate,
    );
    return { ok: true, result: { ...result, source: "public" } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to check availability right now.",
    };
  }
}

export async function searchGoldenDuskAvailability(
  organizationId: string,
  input: unknown,
): Promise<AvailabilitySearchResponse> {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false, error: "Agent access is required." };
  }

  const parsed = goldenDuskRangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please choose a valid date range.",
    };
  }

  const connection = await getGoldenDuskConnectionSummary(agent.membership.id);
  if (!connection.connected) {
    return {
      ok: false,
      error:
        "Your SWAIBMS session expired. Sign in again as a travel agent to check live availability.",
      notConnected: true,
    };
  }

  try {
    const nights = parsed.data.nights ?? 1;
    const rooms = parsed.data.rooms ?? 1;

    if (parsed.data.productId) {
      const product = await getProduct(
        (await getOperatingOrganizationId()) ?? organizationId,
        parsed.data.productId,
      );
      if (!product) {
        return { ok: false, error: "Product not found." };
      }
      if (!productUsesGoldenDuskAvailability(product)) {
        return {
          ok: false,
          error: "This product is not linked to GoldenDusk accommodation inventory.",
        };
      }

      const result = await fetchGoldenDuskProductAvailabilityRange({
        membershipId: agent.membership.id,
        product: {
          external_id: product.external_id,
          variants: [],
        },
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        nights,
        rooms,
      });
      return { ok: true, result };
    }

    const result = await fetchGoldenDuskAllRoomTypesAvailabilityRange({
      membershipId: agent.membership.id,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      nights,
      rooms,
    });
    return { ok: true, result };
  } catch (error) {
    return mapGoldenDuskAvailabilityError(
      error,
      "Unable to check SWAIBMS availability right now.",
    );
  }
}
