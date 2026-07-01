import "server-only";

import { quoteGoldenDuskBooking } from "./agent-booking-service";
import { getGoldenDuskAccessToken } from "./agent-auth-service";
import type {
  GoldenDuskActivityQuoteLine,
  GoldenDuskActivityQuoteResult,
} from "./agent-auth-types";

export async function quoteGoldenDuskActivity(input: {
  membershipId: string;
  line: GoldenDuskActivityQuoteLine;
}): Promise<GoldenDuskActivityQuoteResult> {
  const session = await getGoldenDuskAccessToken(input.membershipId);
  if (!session) {
    throw new Error("Connect your GoldenDusk agent account in Settings first.");
  }

  const quote = await quoteGoldenDuskBooking({
    membershipId: input.membershipId,
    partySize: input.line.quantity + (input.line.childQuantity ?? 0),
    line: {
      productId: input.line.productId,
      productName: input.line.productName,
      productType: "Activity",
      preferredDate: input.line.dateOfActivity,
      quantity: input.line.quantity,
      childQuantity: input.line.childQuantity ?? 0,
    },
    customer: {
      contactName: input.line.productName,
    },
  });

  return {
    totalAmount: quote.totalAmount,
    amountDue: quote.amountDue,
    currencyCode: quote.currencyCode,
    message: null,
    raw: quote.reservation as unknown as Record<string, unknown>,
  };
}
