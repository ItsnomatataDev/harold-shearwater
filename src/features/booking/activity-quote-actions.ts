"use server";

import { z } from "zod";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { GoldenDuskApiError } from "@/features/integrations/golden-dusk/client";
import { quoteGoldenDuskActivity } from "@/features/integrations/golden-dusk/agent-quote-service";
import {
  getGoldenDuskAgencyCreditLine,
  isCreditLimitExceeded,
  mapCreditLimitApiError,
} from "@/features/integrations/golden-dusk/agent-credit";
import { parseGoldenDuskActivityId } from "@/features/integrations/golden-dusk/product-external-id";
import {
  getOperatingOrganizationId,
  getProduct,
} from "@/features/products/products-service";

const quoteSchema = z.object({
  productId: z.string().uuid(),
  preferredDate: z.iso.date(),
  partySize: z.coerce.number().int().min(1).max(100),
});

export type ActivityQuoteResponse =
  | {
      ok: true;
      totalAmount: number;
      amountDue: number | null;
      currencyCode: string;
      quotedAt: string;
      agencyCredit: Awaited<ReturnType<typeof getGoldenDuskAgencyCreditLine>>;
      creditExceeded: boolean;
    }
  | {
      ok: false;
      error: string;
      notConnected?: boolean;
      creditExceeded?: boolean;
    };

export async function quoteAgentActivityBooking(
  organizationId: string,
  input: unknown,
): Promise<ActivityQuoteResponse> {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false, error: "Agent access is required." };
  }

  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid quote request.",
    };
  }

  const product = await getProduct(
    (await getOperatingOrganizationId()) ?? organizationId,
    parsed.data.productId,
  );
  if (!product) {
    return { ok: false, error: "Product not found." };
  }

  const goldenDuskProductId = parseGoldenDuskActivityId(product.external_id);
  if (!goldenDuskProductId) {
    return {
      ok: false,
      error: "This product is not linked to GoldenDusk activity inventory.",
    };
  }

  try {
    const quote = await quoteGoldenDuskActivity({
      membershipId: agent.membership.id,
      line: {
        productId: goldenDuskProductId,
        productName: product.name,
        dateOfActivity: parsed.data.preferredDate,
        quantity: parsed.data.partySize,
      },
    });

    const agencyCredit = await getGoldenDuskAgencyCreditLine(agent.membership.id);

    return {
      ok: true,
      totalAmount: quote.totalAmount,
      amountDue: quote.amountDue,
      currencyCode: quote.currencyCode ?? "USD",
      quotedAt: new Date().toISOString(),
      agencyCredit,
      creditExceeded: isCreditLimitExceeded(agencyCredit, quote.totalAmount),
    };
  } catch (error) {
    if (error instanceof GoldenDuskApiError) {
      const notConnected = error.message
        .toLowerCase()
        .includes("connect your golden dusk")
        || error.message.toLowerCase().includes("swaibms session expired");
      const creditExceeded = error.message.toLowerCase().includes("credit limit");
      const creditMessage = mapCreditLimitApiError(error.message);
      return {
        ok: false,
        error: creditMessage ?? error.message,
        notConnected,
        creditExceeded: creditExceeded || Boolean(creditMessage),
      };
    }
    const message =
      error instanceof Error ? error.message : "Unable to quote this activity.";
    const notConnected = message
      .toLowerCase()
      .includes("connect your golden dusk")
      || message.toLowerCase().includes("swaibms session expired");
    return { ok: false, error: message, notConnected };
  }
}
