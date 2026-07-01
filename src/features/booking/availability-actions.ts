"use server";

import { z } from "zod";
import { getAuthContext } from "@/features/auth/services/auth-context";
import {
  fetchAvailability,
  type AvailabilityResult,
} from "./availability-service";

const MAX_RANGE_DAYS = 62;

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
    { message: `Please search a range of ${MAX_RANGE_DAYS} days or less.`, path: ["endDate"] },
  );

export type AvailabilitySearchResponse =
  | { ok: true; result: AvailabilityResult }
  | { ok: false; error: string };

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
    return { ok: true, result };
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
