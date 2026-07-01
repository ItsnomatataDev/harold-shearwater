"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  submitAgentProductBookingRequest,
  type BookingRequestResponse,
} from "./booking-request-actions";

function formatDisplayDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function RoomBookingRequestForm({
  organizationId,
  productId,
  productName,
  unitLabel,
  preferredDate,
  endDate,
  unitsAvailable,
  fromRate,
  onCancel,
}: {
  organizationId: string;
  productId: string;
  productName: string;
  unitLabel: string;
  preferredDate: string;
  endDate: string;
  unitsAvailable: number;
  fromRate?: { currency: string; price: number; planName: string };
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [notes, setNotes] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const rateNote = fromRate
      ? `Quoted net rate: ${fromRate.currency} ${fromRate.price.toFixed(2)} (${fromRate.planName}).`
      : null;
    const availabilityNote = `${unitsAvailable} unit${unitsAvailable === 1 ? "" : "s"} available in ${unitLabel} when checked.`;

    startTransition(async () => {
      const response: BookingRequestResponse =
        await submitAgentProductBookingRequest(organizationId, {
          productId,
          productName,
          preferredDate,
          endDate: endDate !== preferredDate ? endDate : undefined,
          partySize,
          optionLabel: unitLabel,
          contactName: contactName || undefined,
          notes: [notes, rateNote, availabilityNote].filter(Boolean).join("\n\n"),
        });

      if (response.ok) {
        setReference(response.reference);
      } else {
        setError(response.error);
      }
    });
  }

  if (reference) {
    return (
      <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/15 p-5">
        <div className="flex items-center gap-2 text-emerald-300">
          <Icon name="checkCircle" className="h-5 w-5" />
          <h3 className="text-sm font-semibold">Booking request sent</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-emerald-100/80">
          Enquiry <span className="font-mono text-white">{reference}</span> is in
          your pipeline. Shearwater will confirm the room assignment and next steps.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/agent/enquiries"
            className="btn-primary inline-flex items-center gap-2 text-xs"
          >
            View enquiries
          </Link>
          <button type="button" onClick={onCancel} className="btn-ghost text-xs">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-gold/25 bg-[#181816] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-gold">
            Request booking
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">{productName}</h3>
          <p className="mt-1 text-xs text-[#9b9b94]">
            {formatDisplayDate(preferredDate)}
            {endDate !== preferredDate
              ? ` → ${formatDisplayDate(endDate)}`
              : ""}{" "}
            · {unitLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1 text-[#85857d] transition hover:bg-[#222220] hover:text-white"
          aria-label="Close booking form"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      </div>

      {fromRate && (
        <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold">
          Contracted net rate: {fromRate.currency} {fromRate.price.toFixed(2)} per
          person · {fromRate.planName}
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
          Client name
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Who is this booking for?"
            className="input mt-2 w-full"
            required
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
          Party size
          <input
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            className="input mt-2 w-full"
            required
          />
        </label>
      </div>

      <label className="mt-4 block text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Client preferences, arrival time, special requirements…"
          className="input mt-2 w-full resize-none"
        />
      </label>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/15 px-3 py-2 text-xs text-red-200">
          <Icon name="alertCircle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send booking request"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
      <p className="mt-3 text-[11px] leading-4 text-[#77776f]">
        This is a request only — not a confirmed reservation. Shearwater assigns
        the exact room after approval.
      </p>
    </form>
  );
}
