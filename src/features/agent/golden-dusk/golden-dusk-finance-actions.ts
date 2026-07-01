"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { GoldenDuskApiError } from "@/features/integrations/golden-dusk/client";
import {
  defaultFinanceDateRange,
  getGoldenDuskAgencyFinanceOverview,
  normalizeFinanceDateRange,
} from "@/features/integrations/golden-dusk/agent-finance-service";

const rangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function mapFinanceError(error: unknown, fallback: string) {
  if (error instanceof GoldenDuskApiError) {
    const notConnected =
      error.message.toLowerCase().includes("swaibms session expired")
      || error.message.toLowerCase().includes("connect your golden dusk");
    if (error.status === 429) {
      return {
        ok: false as const,
        error: "SWAIBMS is busy right now. Wait a minute and try again.",
        notConnected,
      };
    }
    return { ok: false as const, error: error.message, notConnected };
  }
  const message = error instanceof Error ? error.message : fallback;
  const notConnected =
    message.toLowerCase().includes("swaibms session expired")
    || message.toLowerCase().includes("connect your golden dusk");
  return { ok: false as const, error: message, notConnected };
}

export async function loadAgentFinanceOverview(
  organizationId: string,
  input?: unknown,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false as const, error: "Agent access is required." };
  }

  const parsed = rangeSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid date range.",
    };
  }

  const range = parsed.data.from || parsed.data.to
    ? normalizeFinanceDateRange({
        from: parsed.data.from,
        to: parsed.data.to,
      })
    : defaultFinanceDateRange();

  try {
    const overview = await getGoldenDuskAgencyFinanceOverview(
      agent.membership.id,
      range,
    );
    return { ok: true as const, overview };
  } catch (error) {
    return mapFinanceError(error, "Unable to load SWAIBMS finance right now.");
  }
}

export async function refreshAgentFinanceOverview(
  organizationId: string,
  input?: unknown,
) {
  const result = await loadAgentFinanceOverview(organizationId, input);
  if (result.ok) {
    revalidatePath("/agent/finance");
  }
  return result;
}
