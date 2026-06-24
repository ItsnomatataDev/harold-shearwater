"use server";

import { z } from "zod";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { getBookingProvider } from "./booking-provider";

const availabilitySchema = z.object({
  productId: z.string().uuid(),
  date: z.iso.date(),
  partySize: z.coerce.number().int().min(1).max(100),
});

export async function searchLiveAvailability(
  organizationId: string,
  input: unknown,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    throw new Error("Agent access is required.");
  }
  const parsed = availabilitySchema.parse(input);
  const provider = getBookingProvider();
  return provider.searchAvailability({ organizationId, ...parsed });
}
