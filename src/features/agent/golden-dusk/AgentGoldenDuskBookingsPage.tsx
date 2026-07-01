"use client";

import Link from "next/link";
import type { GoldenDuskReservation } from "@/features/integrations/golden-dusk/agent-booking-types";
import { goldenDuskDocumentHref } from "./golden-dusk-document-links";

function formatMoney(amount: number | undefined, currency = "USD") {
  if (typeof amount !== "number") return "—";
  return `${currency} ${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function AgentGoldenDuskBookingsPage({
  bookings,
  connected,
  error,
}: {
  bookings: GoldenDuskReservation[];
  connected: boolean;
  error: string | null;
}) {
  if (!connected) {
    return (
      <div className="rounded-2xl border border-gold/30 bg-gold/10 px-5 py-6 text-sm text-[#e8dcc0]">
        Sign in again using{" "}
        <span className="font-semibold text-gold">Travel agent</span> on the login
        page to load your bookings automatically. If your session expired, you can
        also reconnect in{" "}
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

  if (!bookings.length) {
    return (
      <div className="rounded-2xl border border-[#2f2f2b] bg-[#1a1a18] px-5 py-10 text-center text-sm text-[#777]">
        No GoldenDusk bookings yet. Confirm a product booking from the catalog to
        create one in SWAIBMS.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#2f2f2b] bg-[#1a1a18]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-[#2f2f2b] bg-[#141412] text-[10px] uppercase tracking-[.14em] text-[#666]">
            <tr>
              <th className="px-4 py-3 font-semibold">SWAIBMS #</th>
              <th className="px-4 py-3 font-semibold">Guest</th>
              <th className="px-4 py-3 font-semibold">Arrival</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Documents</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const guest = [booking.customerFirstName, booking.customerLastName]
                .filter(Boolean)
                .join(" ");
              const product =
                booking.activityReservationProducts?.[0]?.productName ??
                booking.accommodationReservationProducts?.[0]?.productName ??
                "Booking";
              return (
                <tr key={booking.id} className="border-b border-[#242421]">
                  <td className="px-4 py-4 font-mono text-white">#{booking.id}</td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-white">{guest || "—"}</p>
                    <p className="mt-1 text-[#777]">{product}</p>
                  </td>
                  <td className="px-4 py-4 text-[#ccc]">
                    {formatDate(booking.dateOfArrival)}
                  </td>
                  <td className="px-4 py-4 text-[#ccc]">
                    {booking.reservationStatus ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-[#ccc]">
                    {booking.paymentStatus ?? "—"}
                  </td>
                  <td className="px-4 py-4 text-white">
                    {formatMoney(booking.totalAmount, booking.currency?.code ?? "USD")}
                  </td>
                  <td className="px-4 py-4">
                    <a
                      href={goldenDuskDocumentHref(booking.id, "FiscalTaxInvoice")}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold hover:underline"
                    >
                      Invoice
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
