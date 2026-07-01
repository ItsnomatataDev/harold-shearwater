import type { AgencyFinanceRecord } from "./agent-finance-types";

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readString(record[key]);
    if (value) return value;
  }
  return null;
}

function pickNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readNumber(record[key]);
    if (value != null) return value;
  }
  return null;
}

export function unwrapFinanceList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => readRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }

  const record = readRecord(payload);
  if (!record) return [];

  const nested =
    record.items ??
    record.Items ??
    record.lines ??
    record.Lines ??
    record.invoices ??
    record.Invoices ??
    record.payments ??
    record.Payments ??
    record.refunds ??
    record.Refunds ??
    record.data ??
    record.Data;

  if (Array.isArray(nested)) {
    return nested
      .map((entry) => readRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  }

  if (nested && typeof nested === "object") {
    const inner = readRecord(nested);
    if (inner) return unwrapFinanceList(inner);
  }

  return [];
}

export function normalizeFinanceRecord(
  raw: Record<string, unknown>,
): AgencyFinanceRecord {
  const id =
    pickNumber(raw, ["id", "Id", "invoiceId", "InvoiceId", "paymentId", "PaymentId"]) ??
    null;

  return {
    id: id != null ? Math.trunc(id) : null,
    reference: pickString(raw, [
      "reference",
      "Reference",
      "invoiceNumber",
      "InvoiceNumber",
      "number",
      "Number",
      "documentNumber",
      "DocumentNumber",
    ]),
    date:
      pickString(raw, [
        "date",
        "Date",
        "invoiceDate",
        "InvoiceDate",
        "paymentDate",
        "PaymentDate",
        "transactionDate",
        "TransactionDate",
        "createdAt",
        "CreatedAt",
      ]) ?? null,
    description: pickString(raw, [
      "description",
      "Description",
      "productName",
      "ProductName",
      "narration",
      "Narration",
      "notes",
      "Notes",
    ]),
    amount:
      pickNumber(raw, [
        "amount",
        "Amount",
        "totalAmount",
        "TotalAmount",
        "invoiceAmount",
        "InvoiceAmount",
        "lineTotal",
        "LineTotal",
      ]) ?? null,
    currencyCode: pickString(raw, [
      "currencyCode",
      "CurrencyCode",
      "currency",
      "Currency",
    ]),
    status: pickString(raw, ["status", "Status", "paymentStatus", "PaymentStatus"]),
    bookingId:
      pickNumber(raw, ["bookingId", "BookingId", "reservationId", "ReservationId"]) ??
      null,
    guestName: pickString(raw, [
      "guestName",
      "GuestName",
      "customerName",
      "CustomerName",
      "clientName",
      "ClientName",
    ]),
    raw,
  };
}

export function parseFinanceRecordList(payload: unknown): AgencyFinanceRecord[] {
  return unwrapFinanceList(payload).map(normalizeFinanceRecord);
}
