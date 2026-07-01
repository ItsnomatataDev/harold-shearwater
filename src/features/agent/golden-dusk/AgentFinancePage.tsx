"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refreshAgentFinanceOverview } from "@/features/agent/golden-dusk/golden-dusk-finance-actions";
import {
  financeInvoicePdfHref,
  financeStatementPdfHref,
} from "@/features/agent/golden-dusk/golden-dusk-finance-links";
import {
  describeAgencyCredit,
  formatFinanceDate,
  formatFinanceMoney,
} from "@/features/integrations/golden-dusk/agent-finance-display";
import type {
  AgencyFinanceOverview,
  AgencyFinanceRecord,
} from "@/features/integrations/golden-dusk/agent-finance-types";

type FinanceTab = "invoices" | "statement" | "payments" | "refunds";

function isoDateOnly(value: string) {
  return value.slice(0, 10);
}

function FinanceRecordsTable({
  records,
  emptyLabel,
  showInvoicePdf = false,
  currencyId,
}: {
  records: AgencyFinanceRecord[];
  emptyLabel: string;
  showInvoicePdf?: boolean;
  currencyId?: number | null;
}) {
  if (!records.length) {
    return (
      <div className="rounded-2xl border border-[#2f2f2b] bg-[#1a1a18] px-5 py-10 text-center text-sm text-[#777]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2f2f2b] bg-[#1a1a18]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-[#2f2f2b] bg-[#141412] text-[10px] uppercase tracking-[.14em] text-[#666]">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Reference</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {showInvoicePdf ? (
                <th className="px-4 py-3 font-semibold">PDF</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const currency = record.currencyCode ?? "USD";
              const key = `${record.id ?? record.reference ?? index}`;
              return (
                <tr key={key} className="border-b border-[#242421] last:border-0">
                  <td className="px-4 py-3 text-[#ccc]">
                    {formatFinanceDate(record.date)}
                  </td>
                  <td className="px-4 py-3 font-mono text-white">
                    {record.reference ?? (record.id ? `#${record.id}` : "—")}
                  </td>
                  <td className="px-4 py-3 text-[#aaa]">
                    <p>{record.description ?? record.guestName ?? "—"}</p>
                    {record.bookingId ? (
                      <p className="mt-1 text-[#666]">Booking #{record.bookingId}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-white">
                    {formatFinanceMoney(record.amount, currency)}
                  </td>
                  <td className="px-4 py-3 text-[#aaa]">{record.status ?? "—"}</td>
                  {showInvoicePdf ? (
                    <td className="px-4 py-3">
                      {record.id ? (
                        <a
                          href={financeInvoicePdfHref(record.id, currencyId)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gold hover:underline"
                        >
                          PDF
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AgentFinancePage({
  organizationId,
  connected,
  error,
  overview,
  fromDate,
  toDate,
}: {
  organizationId: string;
  connected: boolean;
  error: string | null;
  overview: AgencyFinanceOverview | null;
  fromDate: string;
  toDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statementPdfPending, setStatementPdfPending] = useState(false);
  const [statementPdfError, setStatementPdfError] = useState<string | null>(null);
  const [tab, setTab] = useState<FinanceTab>("invoices");
  const [rangeFrom, setRangeFrom] = useState(fromDate);
  const [rangeTo, setRangeTo] = useState(toDate);

  const credit = overview?.balance?.primary ?? null;
  const creditView = credit ? describeAgencyCredit(credit) : null;
  const currencyId = credit?.currencyId ?? null;
  const canDownloadStatementPdf =
    (overview?.invoices.length ?? 0) > 0 || (overview?.statement.length ?? 0) > 0;

  function applyRange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatementPdfError(null);
    const params = new URLSearchParams();
    if (rangeFrom) params.set("from", rangeFrom);
    if (rangeTo) params.set("to", rangeTo);
    router.push(`/agent/finance?${params.toString()}`);
  }

  function refresh() {
    startTransition(async () => {
      setStatementPdfError(null);
      const result = await refreshAgentFinanceOverview(organizationId, {
        from: `${rangeFrom}T00:00:00.000Z`,
        to: `${rangeTo}T23:59:59.999Z`,
      });
      if (!result.ok && result.error) {
        // Surface via refresh revalidation; page reload shows server error if needed.
      }
      router.refresh();
    });
  }

  async function openStatementPdf() {
    if (!overview || !canDownloadStatementPdf) return;

    setStatementPdfPending(true);
    setStatementPdfError(null);

    try {
      const href = financeStatementPdfHref({
        from: overview.range.from,
        to: overview.range.to,
      });
      const response = await fetch(href);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setStatementPdfError(
          body?.error ??
            "Unable to download the statement PDF for this date range.",
        );
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setStatementPdfError("Unable to download the statement PDF right now.");
    } finally {
      setStatementPdfPending(false);
    }
  }

  if (!connected) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gold/10 px-5 py-6 text-sm text-[#e8dcc0]">
        Sign in again as a{" "}
        <span className="font-semibold text-gold">travel agent</span> to load SWAIBMS
        finance. You can also reconnect in{" "}
        <Link href="/agent/settings" className="font-semibold text-gold hover:underline">
          Settings
        </Link>
        .
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-700/40 bg-red-900/15 px-5 py-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="rounded-2xl border border-[#2f2f2b] bg-[#1a1a18] px-5 py-10 text-center text-sm text-[#777]">
        No SWAIBMS finance data returned.
      </div>
    );
  }

  const tabs: { id: FinanceTab; label: string; count: number }[] = [
    { id: "invoices", label: "Invoices", count: overview.invoices.length },
    { id: "statement", label: "Statement", count: overview.statement.length },
    { id: "payments", label: "Payments", count: overview.payments.length },
    { id: "refunds", label: "Refunds", count: overview.refunds.length },
  ];

  return (
    <div className="space-y-6">
      {credit && creditView ? (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]">
          <div
            className={`rounded-2xl border px-5 py-5 ${
              creditView.tone === "danger"
                ? "border-red-700/40 bg-red-900/10"
                : creditView.tone === "warning"
                  ? "border-amber-700/40 bg-amber-900/10"
                  : "border-gold/30 bg-gold/5"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">
              Agency credit · SWAIBMS balance
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {creditView.availableLabel}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#b9b0a0]">
              {creditView.detail}
            </p>
          </div>
          <div className="rounded-2xl border border-[#2f2f2b] bg-[#1a1a18] p-5">
            <dl className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#777]">Credit limit</dt>
                <dd className="font-medium text-white">
                  {formatFinanceMoney(credit.creditLimit, credit.currencyCode)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#777]">Outstanding</dt>
                <dd className="font-medium text-white">
                  {formatFinanceMoney(credit.outstanding, credit.currencyCode)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#777]">Available</dt>
                <dd className="font-medium text-white">
                  {formatFinanceMoney(credit.available, credit.currencyCode)}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#2f2f2b] bg-[#1d1d1b] p-5">
        <form
          onSubmit={applyRange}
          className="flex flex-wrap items-end gap-4"
        >
          <label className="text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
            From
            <input
              type="date"
              value={rangeFrom}
              onChange={(event) => setRangeFrom(event.target.value)}
              className="input mt-2 block"
            />
          </label>
          <label className="text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
            To
            <input
              type="date"
              value={rangeTo}
              min={rangeFrom}
              onChange={(event) => setRangeTo(event.target.value)}
              className="input mt-2 block"
            />
          </label>
          <button type="submit" className="btn-ghost text-xs">
            Apply range
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={refresh}
            className="btn-primary text-xs disabled:opacity-50"
          >
            {pending ? "Refreshing…" : "Refresh from SWAIBMS"}
          </button>
          <button
            type="button"
            disabled={pending || statementPdfPending || !canDownloadStatementPdf}
            onClick={openStatementPdf}
            className="btn-ghost text-xs disabled:cursor-not-allowed disabled:opacity-50"
            title={
              canDownloadStatementPdf
                ? "Download statement PDF for the selected date range"
                : "Statement PDF needs at least one invoice or statement line in range"
            }
          >
            {statementPdfPending ? "Opening PDF…" : "Statement PDF"}
          </button>
        </form>
        {statementPdfError ? (
          <p className="mt-3 text-xs leading-5 text-red-300">{statementPdfError}</p>
        ) : null}
        <p className="mt-3 text-[11px] text-[#666]">
          Showing SWAIBMS finance from {isoDateOnly(overview.range.from)} to{" "}
          {isoDateOnly(overview.range.to)}.
        </p>
      </section>

      <div className="inline-flex flex-wrap gap-2 rounded-xl border border-[#2f2f2b] bg-[#141412] p-1 text-xs">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-3 py-2 font-medium transition ${
              tab === item.id
                ? "bg-savannah text-black"
                : "text-[#85857d] hover:text-white"
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      {tab === "invoices" ? (
        <FinanceRecordsTable
          records={overview.invoices}
          emptyLabel="No invoices returned for this date range."
          showInvoicePdf
          currencyId={currencyId}
        />
      ) : null}
      {tab === "statement" ? (
        <FinanceRecordsTable
          records={overview.statement}
          emptyLabel="No statement lines returned for this date range."
        />
      ) : null}
      {tab === "payments" ? (
        <FinanceRecordsTable
          records={overview.payments}
          emptyLabel="No payments returned for this date range."
        />
      ) : null}
      {tab === "refunds" ? (
        <FinanceRecordsTable
          records={overview.refunds}
          emptyLabel="No refunds returned for this date range."
        />
      ) : null}
    </div>
  );
}
