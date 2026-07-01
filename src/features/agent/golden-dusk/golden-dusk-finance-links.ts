export function financeInvoicePdfHref(invoiceId: number, currencyId?: number | null) {
  const params = new URLSearchParams();
  if (currencyId != null) params.set("currencyId", String(currencyId));
  const suffix = params.size ? `?${params.toString()}` : "";
  return `/api/agent/golden-dusk/finance/invoices/${invoiceId}/pdf${suffix}`;
}

export function financeStatementPdfHref(input: {
  from: string;
  to: string;
  currencyId?: number | null;
}) {
  const params = new URLSearchParams({
    from: input.from.slice(0, 10) + "T00:00:00.000Z",
    to: input.to.slice(0, 10) + "T23:59:59.999Z",
  });
  if (input.currencyId != null) {
    params.set("currencyId", String(input.currencyId));
  }
  return `/api/agent/golden-dusk/finance/statement/pdf?${params.toString()}`;
}
