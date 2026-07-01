"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import type { EnquiryStatus } from "@/features/agent/enquiries/enquiries-service";
import {
  addTeamEnquiryNote,
  placeTeamEnquiryHold,
  updateTeamEnquiryStatus,
} from "./team-bookings-actions";
import type { TeamInboxEnquiry } from "./team-bookings-service";
import type { AgentEnquiryEvent } from "@/features/agent/enquiries/enquiries-service";
import { ReservationHoldBanner } from "@/features/booking/ReservationHoldBanner";
import { GoldenDuskBookingSummary } from "@/features/agent/golden-dusk/GoldenDuskBookingSummary";
import { RESERVATION_HOLD_HOURS } from "@/features/booking/reservation-holds";

const STATUSES: { value: EnquiryStatus; label: string }[] = [
  { value: "new", label: "New enquiry" },
  { value: "qualifying", label: "Qualifying" },
  { value: "quote_requested", label: "Quote requested" },
  { value: "quoted", label: "Quoted" },
  { value: "reservation_requested", label: "Reservation requested" },
  { value: "on_hold", label: "On hold (72h)" },
  { value: "confirmed", label: "Confirmed" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TeamEnquiryDetailPage({
  organizationId,
  enquiry,
  events,
}: {
  organizationId: string;
  enquiry: TeamInboxEnquiry;
  events: AgentEnquiryEvent[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function run(work: () => Promise<void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        after?.();
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to save changes.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/team/bookings"
            className="inline-flex items-center gap-1 text-xs text-[#777] hover:text-white"
          >
            <Icon name="chevronLeft" className="h-3.5 w-3.5" />
            Booking requests
          </Link>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-savannah">
            {enquiry.reference}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {enquiry.contactName}
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            {enquiry.productInterest ?? "General Shearwater enquiry"}
          </p>
          <p className="mt-2 text-xs text-[#85857d]">
            Agent: {enquiry.agentName}
            {enquiry.agentAgency ? ` · ${enquiry.agentAgency}` : ""}
            {enquiry.agentEmail ? ` · ${enquiry.agentEmail}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!["on_hold", "confirmed", "complete", "cancelled"].includes(
            enquiry.status,
          ) && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  placeTeamEnquiryHold(organizationId, enquiry.id),
                )
              }
              className="btn-secondary text-xs disabled:opacity-50"
            >
              Place {RESERVATION_HOLD_HOURS}h hold
            </button>
          )}
          <select
          value={enquiry.status}
          disabled={pending}
          onChange={(event) =>
            run(() =>
              updateTeamEnquiryStatus(
                organizationId,
                enquiry.id,
                event.target.value as EnquiryStatus,
              ),
            )
          }
          className="input min-w-52 text-xs"
        >
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
        </div>
      </header>

      <ReservationHoldBanner
        holdExpiresAt={enquiry.holdExpiresAt}
        status={enquiry.status}
      />

      <GoldenDuskBookingSummary
        organizationId={organizationId}
        enquiry={enquiry}
        audience="team"
      />

      {error && (
        <p className="rounded-xl bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
          <h2 className="text-sm font-semibold text-white">Request details</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[#666]">
                Preferred date
              </dt>
              <dd className="text-white">{formatDate(enquiry.requestedDate)}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[#666]">
                Party size
              </dt>
              <dd className="text-white">{enquiry.partySize}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[#666]">
                Client contact
              </dt>
              <dd className="text-white">
                {enquiry.contactEmail ?? enquiry.contactPhone ?? "—"}
              </dd>
            </div>
            {enquiry.notes && (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[#666]">
                  Notes
                </dt>
                <dd className="whitespace-pre-wrap text-[#c8c8c0]">
                  {enquiry.notes}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
          <h2 className="text-sm font-semibold text-white">Team note</h2>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            className="input mt-3 w-full resize-none"
            placeholder="Internal note for reservations or guest relations…"
          />
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={() =>
              run(
                () =>
                  addTeamEnquiryNote(organizationId, {
                    enquiryId: enquiry.id,
                    body: note.trim(),
                  }),
                () => setNote(""),
              )
            }
            className="btn-primary mt-3 disabled:opacity-50"
          >
            Add note
          </button>
        </section>
      </div>

      <section className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
        <h2 className="text-sm font-semibold text-white">Activity</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-xs text-[#666]">No activity yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-[#2a2a27] bg-[#141412] px-4 py-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#666]">
                  {event.eventType.replaceAll("_", " ")} ·{" "}
                  {new Date(event.createdAt).toLocaleString("en-GB")}
                </p>
                <p className="mt-1 text-sm text-[#d8d8d0]">{event.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
