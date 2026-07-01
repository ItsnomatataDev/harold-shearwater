type CreditSummary = {
  currencyCode: string;
  available: number;
};

export function formatFinanceMoney(
  amount: number | null | undefined,
  currencyCode = "USD",
) {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `${currencyCode} ${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatFinanceDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function describeAgencyCredit(credit: CreditSummary) {
  const currency = credit.currencyCode || "USD";
  const format = (value: number) =>
    value.toLocaleString("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  if (credit.available < 0) {
    return {
      tone: "danger" as const,
      availableLabel: `Over credit limit by ${currency} ${format(Math.abs(credit.available))}`,
      detail:
        "New SWAIBMS confirmations are blocked until Shearwater finance increases your facility or outstanding balance is reduced.",
    };
  }

  if (credit.available === 0) {
    return {
      tone: "warning" as const,
      availableLabel: `${currency} 0.00 available`,
      detail: "Your agency has no remaining credit headroom for new live confirmations.",
    };
  }

  return {
    tone: "ok" as const,
    availableLabel: `${currency} ${format(credit.available)} available`,
    detail: "This balance comes live from SWAIBMS and is checked before booking confirmation.",
  };
}
