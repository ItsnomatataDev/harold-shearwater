"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import {
  cancelGoldenDuskEnquiryBooking,
  refreshGoldenDuskEnquiryMirror,
} from "@/features/agent/golden-dusk/golden-dusk-booking-actions";
import { goldenDuskDocumentHref } from "@/features/agent/golden-dusk/golden-dusk-document-links";
import type { AgentEnquiry } from "@/features/agent/enquiries/enquiries-service";

function formatWhen(value: string | null) {
  if (!value) return "Not synced yet";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function GoldenDuskBookingSummary({
  organizationId,
  enquiry,
  audience,
}: {
  organizationId: string;
  enquiry: Pick<
    AgentEnquiry,
    | "id"
    | "goldenDuskBookingId"
    | "goldenDuskReservationStatus"
    | "goldenDuskPaymentStatus"
    | "goldenDuskSyncedAt"
    | "externalBookingReference"
    | "quoteAmount"
    | "quoteCurrency"
    | "status"
  >;
  audience: "agent" | "team";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bookingId = enquiry.goldenDuskBookingId;

  if (!bookingId) return null;

  function run(work: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        setError(result.error ?? "Unable to update booking.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-gold/25 bg-gold/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">
            SWAIBMS / GoldenDusk
          </p>
          <h2 className="mt-1 text-sm font-semibold text-white">
            Live booking #{bookingId}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#c8c0a8]">
            Harold mirrors what SWAIBMS reports so the team can read status here
            without opening GoldenDusk.
          </p>
        </div>
        {audience === "agent" && enquiry.status !== "cancelled" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  refreshGoldenDuskEnquiryMirror(organizationId, {
                    enquiryId: enquiry.id,
                    bookingId,
                  }),
                )
              }
              className="btn-ghost text-xs"
            >
              Refresh status
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  cancelGoldenDuskEnquiryBooking(organizationId, {
                    enquiryId: enquiry.id,
                    bookingId,
                  }),
                )
              }
              className="rounded-xl border border-red-700/40 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-900/20 disabled:opacity-50"
            >
              Cancel in GoldenDusk
            </button>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-700/40 bg-red-900/15 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Reservation", enquiry.goldenDuskReservationStatus ?? "Unknown"],
          ["Payment", enquiry.goldenDuskPaymentStatus ?? "Unknown"],
          [
            "Total",
            enquiry.quoteAmount != null
              ? `${enquiry.quoteCurrency} ${enquiry.quoteAmount.toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "—",
          ],
          ["Last sync", formatWhen(enquiry.goldenDuskSyncedAt)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#3a3528] bg-[#1a1814] p-3">
            <dt className="text-[9px] font-bold uppercase tracking-wider text-[#8f8468]">
              {label}
            </dt>
            <dd className="mt-2 text-xs font-medium text-white">{value}</dd>
          </div>
        ))}
      </dl>

      {audience === "agent" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["FiscalTaxInvoice", "Tax invoice"],
              ["ProformaInvoice", "Proforma"],
              ["Quotation", "Quotation"],
              ["Receipt", "Receipt"],
            ] as const
          ).map(([type, label]) => (
            <a
              key={type}
              href={goldenDuskDocumentHref(bookingId, type)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-[#3a3528] px-3 py-2 text-xs text-[#e8dcc0] hover:bg-[#242018]"
            >
              <Icon name="document" className="h-3.5 w-3.5" />
              {label}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs text-[#8f8468]">
          External reference{" "}
          <span className="font-mono text-white">
            {enquiry.externalBookingReference ?? bookingId}
          </span>
          . Open the linked enquiry in GoldenDusk for documents if needed.
        </p>
      )}

      {audience === "agent" ? (
        <p className="mt-3 text-[11px] text-[#8f8468]">
          View all bookings in{" "}
          <Link href="/agent/bookings" className="text-gold hover:underline">
            GoldenDusk bookings
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}
