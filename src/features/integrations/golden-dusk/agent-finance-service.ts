import "server-only";

import {
  goldenDuskAgentDownload,
  goldenDuskAgentFetch,
} from "./agent-auth-client";
import { getGoldenDuskAccessToken } from "./agent-auth-service";
import { parseAgencyFinanceBalance } from "./agent-finance-balance-parser";
import { parseFinanceRecordList } from "./agent-finance-row-parser";
import type {
  AgencyFinanceBalance,
  AgencyFinanceDateRange,
  AgencyFinanceOverview,
  AgencyFinanceRecord,
} from "./agent-finance-types";

const BALANCE_CACHE_TTL_MS = 30_000;

type BalanceCacheEntry = {
  expiresAt: number;
  data: AgencyFinanceBalance;
};

const balanceCache = new Map<string, BalanceCacheEntry>();

function parseFinanceDay(value: string) {
  const day = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(`Invalid finance date: ${value}`);
  }
  return day;
}

/** Full UTC calendar days — avoids mid-day ISO timestamps excluding same-day rows. */
export function normalizeFinanceDateRange(input?: {
  from?: string | null;
  to?: string | null;
}): AgencyFinanceDateRange {
  const toDay = input?.to ? parseFinanceDay(input.to) : new Date().toISOString().slice(0, 10);
  const fromDay = input?.from
    ? parseFinanceDay(input.from)
    : (() => {
        const anchor = new Date(`${toDay}T00:00:00.000Z`);
        anchor.setUTCDate(anchor.getUTCDate() - 90);
        return anchor.toISOString().slice(0, 10);
      })();

  if (fromDay > toDay) {
    throw new Error("Finance date range start must be on or before end.");
  }

  return {
    from: `${fromDay}T00:00:00.000Z`,
    to: `${toDay}T23:59:59.999Z`,
  };
}

export function defaultFinanceDateRange(days = 90): AgencyFinanceDateRange {
  const toDay = new Date().toISOString().slice(0, 10);
  const fromAnchor = new Date(`${toDay}T00:00:00.000Z`);
  fromAnchor.setUTCDate(fromAnchor.getUTCDate() - days);
  return normalizeFinanceDateRange({
    from: fromAnchor.toISOString().slice(0, 10),
    to: toDay,
  });
}

function financeRangeQuery(range: AgencyFinanceDateRange) {
  const normalized = normalizeFinanceDateRange(range);
  return new URLSearchParams({
    from: normalized.from,
    to: normalized.to,
  });
}

async function withFinanceSession<T>(
  membershipId: string,
  work: (token: string) => Promise<T>,
): Promise<T> {
  const session = await getGoldenDuskAccessToken(membershipId);
  if (!session) {
    throw new Error(
      "Your SWAIBMS session expired. Sign in again as a travel agent to view finance.",
    );
  }
  return work(session.token);
}

async function fetchFinanceList(
  membershipId: string,
  path: string,
  range: AgencyFinanceDateRange,
): Promise<AgencyFinanceRecord[]> {
  return withFinanceSession(membershipId, async (token) => {
    const query = financeRangeQuery(range);
    const payload = await goldenDuskAgentFetch<unknown>(`${path}?${query.toString()}`, {
      token,
    });
    return parseFinanceRecordList(payload);
  });
}

/**
 * Read-only finance call. Uses the stored agent session token only.
 */
export async function getGoldenDuskAgencyBalance(
  membershipId: string,
  options?: { refresh?: boolean },
): Promise<AgencyFinanceBalance | null> {
  if (options?.refresh) {
    balanceCache.delete(membershipId);
  }

  const cached = balanceCache.get(membershipId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const payload = await withFinanceSession(membershipId, (token) =>
    goldenDuskAgentFetch<unknown>("/agent/finance/balance", { token }),
  );

  const balance = parseAgencyFinanceBalance(payload);
  if (!balance.primary) return null;

  balanceCache.set(membershipId, {
    data: balance,
    expiresAt: Date.now() + BALANCE_CACHE_TTL_MS,
  });

  return balance;
}

export async function getGoldenDuskAgencyInvoices(
  membershipId: string,
  range: AgencyFinanceDateRange,
) {
  return fetchFinanceList(membershipId, "/agent/finance/invoices", range);
}

export async function getGoldenDuskAgencyStatement(
  membershipId: string,
  range: AgencyFinanceDateRange,
) {
  return fetchFinanceList(membershipId, "/agent/finance/statement", range);
}

export async function getGoldenDuskAgencyPayments(
  membershipId: string,
  range: AgencyFinanceDateRange,
) {
  return fetchFinanceList(membershipId, "/agent/finance/payments", range);
}

export async function getGoldenDuskAgencyRefunds(
  membershipId: string,
  range: AgencyFinanceDateRange,
) {
  return fetchFinanceList(membershipId, "/agent/finance/refunds", range);
}

export async function getGoldenDuskAgencyFinanceOverview(
  membershipId: string,
  range: AgencyFinanceDateRange = defaultFinanceDateRange(),
): Promise<AgencyFinanceOverview> {
  const normalizedRange = normalizeFinanceDateRange(range);
  const [balance, invoices, statement, payments, refunds] = await Promise.all([
    getGoldenDuskAgencyBalance(membershipId, { refresh: true }).catch(() => null),
    getGoldenDuskAgencyInvoices(membershipId, normalizedRange).catch(() => []),
    getGoldenDuskAgencyStatement(membershipId, normalizedRange).catch(() => []),
    getGoldenDuskAgencyPayments(membershipId, normalizedRange).catch(() => []),
    getGoldenDuskAgencyRefunds(membershipId, normalizedRange).catch(() => []),
  ]);

  return {
    balance,
    invoices,
    statement,
    payments,
    refunds,
    range: normalizedRange,
  };
}

export async function downloadGoldenDuskFinanceInvoicePdf(input: {
  membershipId: string;
  invoiceId: number;
  currencyId?: number | null;
}) {
  return withFinanceSession(input.membershipId, (token) => {
    const params = new URLSearchParams();
    if (input.currencyId != null) {
      params.set("currencyId", String(input.currencyId));
    }
    const suffix = params.size ? `?${params.toString()}` : "";
    return goldenDuskAgentDownload(
      `/agent/finance/invoices/${input.invoiceId}/pdf${suffix}`,
      token,
    );
  });
}

export async function downloadGoldenDuskFinanceStatementPdf(input: {
  membershipId: string;
  range: AgencyFinanceDateRange;
  currencyId?: number | null;
}) {
  const range = normalizeFinanceDateRange(input.range);

  const download = (currencyId?: number | null) =>
    withFinanceSession(input.membershipId, (token) => {
      const params = financeRangeQuery(range);
      if (currencyId != null) {
        params.set("currencyId", String(currencyId));
      }
      return goldenDuskAgentDownload(
        `/agent/finance/statement/pdf?${params.toString()}`,
        token,
      );
    });

  try {
    return await download(input.currencyId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const emptyReport = message.toLowerCase().includes("no invoiced bookings");
    if (input.currencyId != null && emptyReport) {
      return download(null);
    }
    throw error;
  }
}

export function invalidateGoldenDuskAgencyBalanceCache(membershipId: string) {
  balanceCache.delete(membershipId);
}
