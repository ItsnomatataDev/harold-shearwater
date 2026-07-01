import "server-only";

import { getGoldenDuskAgencyBalance } from "./agent-finance-service";
import { fetchGoldenDuskAgentMe } from "./agent-auth-service";

export type AgencyCreditLine = {
  currencyCode: string;
  creditLimit: number;
  outstanding: number;
  available: number;
  hasCreditFacility: boolean;
  source?: "finance-balance" | "auth-me";
};

export function isCreditLimitExceeded(
  credit: AgencyCreditLine | null | undefined,
  bookingAmount: number,
) {
  if (!credit?.hasCreditFacility) return false;
  if (!Number.isFinite(bookingAmount) || bookingAmount <= 0) return false;
  return bookingAmount > credit.available;
}

export function formatCreditLimitExceededMessage(
  credit: AgencyCreditLine,
  bookingAmount: number,
) {
  const currency = credit.currencyCode || "USD";
  const format = (value: number) =>
    value.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return `This booking (${currency} ${format(bookingAmount)}) exceeds your agency SWAIBMS credit available (${currency} ${format(credit.available)}). Ask Shearwater finance to increase your credit facility or settle outstanding balance before confirming.`;
}

export function mapCreditLimitApiError(message: string) {
  if (!message.toLowerCase().includes("credit limit")) {
    return null;
  }
  return "SWAIBMS rejected this confirmation because your agency credit limit would be exceeded. Contact Shearwater finance to increase your facility or reduce outstanding balance, then try again.";
}

function fromAuthMeCredit(
  profile: NonNullable<Awaited<ReturnType<typeof fetchGoldenDuskAgentMe>>>,
): AgencyCreditLine | null {
  const credit = profile.credit;
  const line = credit?.lines?.[0];
  if (!line) return null;

  return {
    currencyCode: line.currencyCode ?? profile.currencyCode ?? "USD",
    creditLimit: line.creditLimit ?? 0,
    outstanding: line.outstanding ?? 0,
    available: line.available ?? 0,
    hasCreditFacility: credit?.hasCreditFacility ?? false,
    source: "auth-me",
  };
}

/**
 * Preferred source: GET /agent/finance/balance (matches SWAIBMS confirm checks).
 * Fallback: /agent/auth/me credit block if finance balance is temporarily unavailable.
 * Read-only — never starts login or MFA.
 */
export async function getGoldenDuskAgencyCreditLine(
  membershipId: string,
): Promise<AgencyCreditLine | null> {
  const balance = await getGoldenDuskAgencyBalance(membershipId).catch(() => null);
  if (balance?.primary) {
    return { ...balance.primary, source: "finance-balance" };
  }

  const profile = await fetchGoldenDuskAgentMe(membershipId).catch(() => null);
  if (!profile) return null;
  return fromAuthMeCredit(profile);
}
