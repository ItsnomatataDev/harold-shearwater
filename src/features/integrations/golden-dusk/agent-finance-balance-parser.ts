import type {
  AgencyFinanceBalance,
  AgencyFinanceBalanceLine,
} from "./agent-finance-types";

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeBalanceLine(raw: Record<string, unknown>): AgencyFinanceBalanceLine | null {
  const creditLimit =
    readNumber(raw.creditLimit) ??
    readNumber(raw.CreditLimit) ??
    readNumber(raw.limit) ??
    0;
  const outstanding =
    readNumber(raw.outstanding) ??
    readNumber(raw.Outstanding) ??
    readNumber(raw.outstandingBalance) ??
    readNumber(raw.OutstandingBalance) ??
    0;
  const available =
    readNumber(raw.available) ??
    readNumber(raw.Available) ??
    readNumber(raw.availableCredit) ??
    readNumber(raw.AvailableCredit) ??
    Math.max(creditLimit - outstanding, 0);

  const currencyCode =
    readString(raw.currencyCode) ??
    readString(raw.CurrencyCode) ??
    readString(raw.currency) ??
    "USD";

  const currencyId =
    readNumber(raw.currencyId) ?? readNumber(raw.CurrencyId) ?? null;

  const hasCreditFacility =
    typeof raw.hasCreditFacility === "boolean"
      ? raw.hasCreditFacility
      : typeof raw.HasCreditFacility === "boolean"
        ? raw.HasCreditFacility
        : typeof raw.isCreditAgent === "boolean"
          ? raw.isCreditAgent
          : creditLimit > 0;

  return {
    currencyId: currencyId != null ? Math.trunc(currencyId) : null,
    currencyCode,
    creditLimit,
    outstanding,
    available,
    hasCreditFacility,
  };
}

function unwrapBalancePayload(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => readRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }

  const record = readRecord(payload);
  if (!record) return [];

  const nested =
    record.lines ??
    record.Lines ??
    record.balances ??
    record.Balances ??
    record.data ??
    record.Data;

  if (Array.isArray(nested)) {
    return nested
      .map((entry) => readRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }

  return [record];
}

export function parseAgencyFinanceBalance(payload: unknown): AgencyFinanceBalance {
  const lines = unwrapBalancePayload(payload)
    .map(normalizeBalanceLine)
    .filter((line): line is AgencyFinanceBalanceLine => Boolean(line));

  return {
    lines,
    primary: lines[0] ?? null,
    source: "finance-balance",
  };
}
