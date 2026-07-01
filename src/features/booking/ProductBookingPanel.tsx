"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import type { ProductWithDetails } from "@/features/products/products-service";
import {
  searchAvailability,
  type AvailabilitySearchResponse,
} from "./availability-actions";
import {
  getProductAvailabilityUnits,
  isRoomTypeProduct,
  productSupportsAvailabilityCheck,
  type AvailabilityResult,
} from "./availability-shared";
import { RoomTypeAvailabilityNotice } from "./RoomTypeAvailabilityNotice";
import {
  submitAgentProductBookingRequest,
  submitCustomerBookingRequest,
  type BookingRequestResponse,
} from "./booking-request-actions";
import { quoteAgentActivityBooking } from "./activity-quote-actions";
import {
  confirmGoldenDuskProductBooking,
  quoteGoldenDuskProductBooking,
} from "@/features/agent/golden-dusk/golden-dusk-booking-actions";
import {
  isGoldenDuskActivityProduct,
  isGoldenDuskBookableProduct,
} from "@/features/integrations/golden-dusk/product-external-id";
import Link from "next/link";

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

function AvailabilitySnapshot({
  result,
  unitKeys,
  roomTypeLabel,
}: {
  result: AvailabilityResult;
  unitKeys: { key: string; label: string }[];
  roomTypeLabel?: string;
}) {
  const keys = new Set(unitKeys.map((unit) => unit.key));
  const visibleUnits =
    unitKeys.length > 0
      ? result.unitTypes.filter((unit) => keys.has(unit.key))
      : result.unitTypes;
  const singleUnit = visibleUnits.length === 1;

  if (!result.days.length) {
    return (
      <p className="text-xs text-[#85857d]">
        No availability returned for these dates.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#2f2f2b] bg-[#141412] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-savannah">
        Live availability — room type
      </p>
      {singleUnit && (
        <RoomTypeAvailabilityNotice compact />
      )}
      <div className="space-y-2">
        {result.days.map((day) => {
          const unit = visibleUnits[0];
          const count = unit
            ? day.units[unit.key as keyof typeof day.units]
            : 0;
          const available = count > 0;

          if (singleUnit && unit) {
            return (
              <div key={day.date} className="rounded-lg bg-[#1d1d1b] px-3 py-3">
                <p className="text-xs font-medium text-white">
                  {formatDisplayDate(day.date)}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      available ? "text-emerald-300" : "text-[#6f6f68]"
                    }`}
                  >
                    {available ? count : "0"}
                  </span>
                  <span className="text-xs text-[#9b9b94]">
                    {available
                      ? `unit${count === 1 ? "" : "s"} of ${roomTypeLabel ?? unit.label} available`
                      : `${roomTypeLabel ?? unit.label} fully booked`}
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-[#77776f]">
                  Exact room assigned after confirmation.
                </p>
              </div>
            );
          }

          return (
            <div key={day.date} className="rounded-lg bg-[#1d1d1b] px-3 py-2">
              <p className="text-xs font-medium text-white">
                {formatDisplayDate(day.date)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {visibleUnits.map((u) => {
                  const unitCount = day.units[u.key as keyof typeof day.units];
                  const unitAvailable = unitCount > 0;
                  return (
                    <span
                      key={u.key}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] ${
                        unitAvailable
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-[#222220] text-[#6f6f68]"
                      }`}
                    >
                      {u.label}:{" "}
                      {unitAvailable ? `${unitCount} units left` : "Full"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProductBookingPanel({
  product,
  audience,
  organizationId,
  goldenDuskConnected = false,
}: {
  product: ProductWithDetails;
  audience: "agent" | "customer";
  organizationId?: string;
  goldenDuskConnected?: boolean;
}) {
  const supportsAvailability = productSupportsAvailabilityCheck(product);
  const isActivityProduct = isGoldenDuskActivityProduct(product);
  const isGoldenDuskProduct = isGoldenDuskBookableProduct(product);
  const canQuoteGoldenDusk =
    audience === "agent" && isGoldenDuskProduct && Boolean(organizationId);
  const liveBookingMode = canQuoteGoldenDusk && goldenDuskConnected;
  const availabilityUnits = getProductAvailabilityUnits(product);
  const isRoomType = isRoomTypeProduct(product);
  const [pending, startTransition] = useTransition();
  const [checking, setChecking] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<null | {
    totalAmount: number;
    amountDue: number | null;
    currencyCode: string;
    quotedAt: string;
  }>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(
    null,
  );
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<null | {
    reference: string;
    bookingId: number;
    enquiryId: string;
  }>(null);
  const [submitted, setSubmitted] = useState<null | {
    reference: string;
    preferredDate: string;
    endDate: string;
    partySize: string;
    optionLabel: string;
  }>(null);
  const [preferredDate, setPreferredDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [partySize, setPartySize] = useState(String(product.min_party_size));
  const [optionLabel, setOptionLabel] = useState(
    product.variants[0]?.name ?? "",
  );
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState("");

  async function runAvailabilityCheck(start: string, end: string) {
    if (!start) return;
    setChecking(true);
    setError(null);
    const response: AvailabilitySearchResponse = await searchAvailability({
      startDate: start,
      endDate: end || start,
    });
    setChecking(false);
    if (response.ok) {
      setAvailability(response.result);
    } else {
      setAvailability(null);
      setError(response.error);
    }
  }

  async function runGoldenDuskQuote() {
    if (!preferredDate || !organizationId) return;
    setQuoting(true);
    setError(null);
    setQuote(null);

    const quoteRequest = {
      productId: product.id,
      preferredDate,
      endDate: endDate || undefined,
      partySize: Number(partySize) || 1,
      contactName: contactName.trim() || "Guest",
      notes: notes || undefined,
    };

    const response = isActivityProduct
      ? await quoteAgentActivityBooking(organizationId, {
          productId: product.id,
          preferredDate,
          partySize: Number(partySize) || 1,
        })
      : await quoteGoldenDuskProductBooking(organizationId, quoteRequest);

    setQuoting(false);
    if (response.ok) {
      setQuote(response);
    } else {
      setError(
        "notConnected" in response && response.notConnected
          ? "Your SWAIBMS session expired. Sign in again as a travel agent, or reconnect in Settings."
          : response.error,
      );
    }
  }

  async function runGoldenDuskConfirm() {
    if (!preferredDate || !organizationId || !contactName.trim()) {
      setError("Client name is required to confirm a GoldenDusk booking.");
      return;
    }
    setConfirming(true);
    setError(null);
    const response = await confirmGoldenDuskProductBooking(organizationId, {
      productId: product.id,
      preferredDate,
      endDate: endDate || undefined,
      partySize: Number(partySize) || 1,
      contactName: contactName.trim(),
      notes: notes || undefined,
    });
    setConfirming(false);
    if (response.ok) {
      setConfirmed({
        reference: response.reference ?? `SWAIBMS-${response.bookingId}`,
        bookingId: response.bookingId,
        enquiryId: response.enquiryId,
      });
    } else {
      setError(
        "notConnected" in response && response.notConnected
          ? "Your SWAIBMS session expired. Sign in again as a travel agent, or reconnect in Settings."
          : response.error,
      );
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const quoteNote = quote
        ? `GoldenDusk quote (${quote.currencyCode} ${quote.totalAmount.toFixed(2)}) on ${new Date(quote.quotedAt).toLocaleString("en-GB")} for ${preferredDate}, party ${partySize}.`
        : undefined;

      const payload = {
        productId: product.id,
        productName: product.name,
        preferredDate: preferredDate || undefined,
        endDate: endDate || undefined,
        partySize,
        optionLabel: optionLabel || undefined,
        notes: [notes, quoteNote].filter(Boolean).join("\n\n") || undefined,
        contactName: contactName || undefined,
      };

      let response: BookingRequestResponse;
      if (audience === "agent") {
        if (!organizationId) {
          setError("Agent organization is not configured.");
          return;
        }
        response = await submitAgentProductBookingRequest(
          organizationId,
          payload,
        );
      } else {
        response = await submitCustomerBookingRequest(payload);
      }

      if (response.ok) {
        setSubmitted({
          reference: response.reference,
          preferredDate,
          endDate,
          partySize,
          optionLabel,
        });
      } else {
        setError(response.error);
      }
    });
  }

  if (confirmed) {
    return (
      <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5">
        <div className="flex items-center gap-2 text-gold">
          <Icon name="checkCircle" className="h-5 w-5" />
          <h3 className="text-sm font-semibold">Confirmed in GoldenDusk</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#e8dcc0]">
          Booking #{confirmed.bookingId} is live in SWAIBMS. Harold mirrored it
          to enquiry {confirmed.reference} and the Shearwater team has been
          notified.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-[#b9a77b]">Harold reference</dt>
            <dd className="font-mono text-white">{confirmed.reference}</dd>
          </div>
          <div>
            <dt className="text-[#b9a77b]">SWAIBMS booking</dt>
            <dd className="font-mono text-white">#{confirmed.bookingId}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/agent/enquiries/${confirmed.enquiryId}`}
            className="btn-primary text-xs"
          >
            Open enquiry
          </Link>
          <Link href="/agent/bookings" className="btn-ghost text-xs">
            All bookings
          </Link>
          <button
            type="button"
            onClick={() => setConfirmed(null)}
            className="btn-ghost text-xs"
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/15 p-5">
        <div className="flex items-center gap-2 text-emerald-300">
          <Icon name="checkCircle" className="h-5 w-5" />
          <h3 className="text-sm font-semibold">Booking request sent</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-emerald-100/80">
          {audience === "agent"
            ? "Your enquiry has been added to your pipeline. Shearwater will confirm availability and next steps."
            : "Thanks — your request is with the Shearwater team. They will confirm availability and follow up with you."}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-emerald-200/60">Reference</dt>
            <dd className="font-mono text-white">{submitted.reference}</dd>
          </div>
          <div>
            <dt className="text-emerald-200/60">Experience</dt>
            <dd className="text-white">{product.name}</dd>
          </div>
          {submitted.preferredDate && (
            <div>
              <dt className="text-emerald-200/60">Preferred date</dt>
              <dd className="text-white">
                {formatDisplayDate(submitted.preferredDate)}
              </dd>
            </div>
          )}
          {submitted.endDate && submitted.endDate !== submitted.preferredDate && (
            <div>
              <dt className="text-emerald-200/60">To</dt>
              <dd className="text-white">{formatDisplayDate(submitted.endDate)}</dd>
            </div>
          )}
          <div>
            <dt className="text-emerald-200/60">Party size</dt>
            <dd className="text-white">{submitted.partySize} guests</dd>
          </div>
          {submitted.optionLabel && (
            <div>
              <dt className="text-emerald-200/60">Option</dt>
              <dd className="text-white">{submitted.optionLabel}</dd>
            </div>
          )}
        </dl>
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className="btn-ghost mt-4 text-xs"
        >
          Make another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {audience === "agent" && (
        <label className="block text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
          Client name
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Who is this booking for?"
            className="input mt-2 w-full"
          />
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
          {supportsAvailability ? "From" : "Preferred date"}
          <input
            type="date"
            value={preferredDate}
            onChange={(e) => {
              setPreferredDate(e.target.value);
              setQuote(null);
            }}
            className="input mt-2 w-full"
          />
        </label>
        <label className="text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
          {supportsAvailability ? "To" : "Party size"}
          {supportsAvailability ? (
            <input
              type="date"
              value={endDate}
              min={preferredDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input mt-2 w-full"
            />
          ) : (
            <input
              type="number"
              value={partySize}
              min={product.min_party_size}
              max={product.max_party_size ?? undefined}
              onChange={(e) => {
                setPartySize(e.target.value);
                setQuote(null);
              }}
              className="input mt-2 w-full"
            />
          )}
        </label>
      </div>

      {supportsAvailability && (
        <label className="block text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
          Party size
          <input
            type="number"
            value={partySize}
            min={product.min_party_size}
            max={product.max_party_size ?? undefined}
            onChange={(e) => {
              setPartySize(e.target.value);
              setQuote(null);
            }}
            className="input mt-2 w-full"
          />
        </label>
      )}

      {product.variants.length > 0 && (
        <label className="block text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
          Option
          <select
            value={optionLabel}
            onChange={(e) => setOptionLabel(e.target.value)}
            className="input mt-2 w-full"
          >
            {product.variants.map((variant) => (
              <option key={variant.id} value={variant.name}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {supportsAvailability && (
        <div className="space-y-3">
          <button
            type="button"
            disabled={!preferredDate || checking}
            onClick={() =>
              runAvailabilityCheck(preferredDate, endDate || preferredDate)
            }
            className="btn-ghost inline-flex w-full items-center justify-center gap-2 text-xs disabled:opacity-50"
          >
            <Icon name="search" className="h-3.5 w-3.5" />
            {checking ? "Checking availability…" : "Check live availability"}
          </button>
          {availability && (
            <AvailabilitySnapshot
              result={availability}
              unitKeys={availabilityUnits}
              roomTypeLabel={isRoomType ? product.name : undefined}
            />
          )}
        </div>
      )}

      {!supportsAvailability && !canQuoteGoldenDusk && (
        <p className="rounded-lg bg-[#141412] px-3 py-2 text-xs leading-5 text-[#85857d]">
          This experience runs daily. Pick your preferred date and we will
          confirm capacity when processing your request.
        </p>
      )}

      {canQuoteGoldenDusk && (
        <div className="space-y-3">
          {!goldenDuskConnected ? (
            <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs leading-5 text-[#e8dcc0]">
              <p className="font-semibold text-gold">SWAIBMS booking unavailable</p>
              <p className="mt-1">
                Sign in again as a{" "}
                <Link href="/auth" className="font-semibold text-gold hover:underline">
                  travel agent
                </Link>{" "}
                to quote and confirm live bookings. If you are already signed in,
                reconnect in{" "}
                <Link href="/agent/settings" className="font-semibold text-gold hover:underline">
                  Settings
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-gold/30 bg-gold/5 p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">
                  Book in SWAIBMS
                </p>
                <p className="mt-1 text-xs leading-5 text-[#c8c0a8]">
                  Quote live price and availability, then confirm directly in
                  GoldenDusk. Harold mirrors the booking to your enquiries and
                  notifies the Shearwater team.
                </p>
              </div>
              <button
                type="button"
                disabled={!preferredDate || quoting || !contactName.trim()}
                onClick={runGoldenDuskQuote}
                className="btn-ghost inline-flex w-full items-center justify-center gap-2 text-xs disabled:opacity-50"
              >
                <Icon name="search" className="h-3.5 w-3.5" />
                {quoting
                  ? "Checking with GoldenDusk…"
                  : "Check price & availability"}
              </button>
              {quote && (
                <div className="rounded-xl border border-emerald-700/30 bg-emerald-900/15 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-emerald-300">
                    GoldenDusk quote
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {quote.currencyCode}{" "}
                    {quote.totalAmount.toLocaleString("en-GB", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="mt-1 text-xs text-emerald-100/80">
                    Net rate for {partySize} guest
                    {Number(partySize) === 1 ? "" : "s"} on{" "}
                    {formatDisplayDate(preferredDate)}.
                  </p>
                  <button
                    type="button"
                    disabled={confirming || !contactName.trim()}
                    onClick={runGoldenDuskConfirm}
                    className="btn-primary mt-4 w-full text-xs disabled:opacity-50"
                  >
                    {confirming
                      ? "Confirming in GoldenDusk…"
                      : "Confirm booking in SWAIBMS"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!supportsAvailability && canQuoteGoldenDusk && goldenDuskConnected && (
        <p className="rounded-lg bg-[#141412] px-3 py-2 text-xs leading-5 text-[#85857d]">
          GoldenDusk validates capacity when quoting. If the quote succeeds,
          space is likely available for your requested date and party size.
        </p>
      )}

      <label className="block text-xs font-medium uppercase tracking-[.14em] text-[#85857d]">
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={
            audience === "agent"
              ? "Client preferences, special requirements, dietary needs…"
              : "Anything we should know — special occasions, requirements, questions…"
          }
          className="input mt-2 w-full resize-none"
        />
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-700/40 bg-red-900/15 px-3 py-2 text-xs text-red-200">
          <Icon name="alertCircle" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p>{error}</p>
            {error.includes("SWAIBMS session expired") ? (
              <p className="mt-2">
                <Link href="/auth" className="font-semibold text-red-100 hover:underline">
                  Sign in again
                </Link>
                {" · "}
                <Link
                  href="/agent/settings"
                  className="font-semibold text-red-100 hover:underline"
                >
                  Settings
                </Link>
              </p>
            ) : null}
          </div>
        </div>
      )}

      {liveBookingMode ? (
        <details className="rounded-xl border border-[#2f2f2b] bg-[#141412] px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-[#9b9b94] hover:text-white">
            Need Shearwater team follow-up instead?
          </summary>
          <p className="mt-3 text-xs leading-5 text-[#77776f]">
            Send an enquiry without confirming in SWAIBMS. Use this when you need
            manual assistance, a custom quote, or the product cannot be booked
            live.
          </p>
          <button
            type="submit"
            disabled={pending || confirming}
            className="btn-ghost mt-4 w-full text-xs disabled:opacity-50"
          >
            {pending ? "Sending request…" : "Send enquiry to Shearwater"}
          </button>
        </details>
      ) : (
        <>
          <button
            type="submit"
            disabled={pending || confirming}
            className="btn-primary w-full disabled:opacity-50"
          >
            {pending ? "Sending request…" : "Request Shearwater follow-up"}
          </button>
          <p className="text-center text-[11px] leading-4 text-[#77776f]">
            This sends a request only. Confirmation and payment follow once
            Shearwater processes your booking.
          </p>
        </>
      )}
    </form>
  );
}
