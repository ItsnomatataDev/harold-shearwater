"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/Icon";
import {
  placeTeamBookingRequestHold,
  updateTeamBookingRequestStatus,
} from "./team-bookings-actions";
import type { BookingRequestStatus } from "./team-bookings-service";
import { ReservationHoldBanner } from "@/features/booking/ReservationHoldBanner";
import { RESERVATION_HOLD_HOURS } from "@/features/booking/reservation-holds";

const STATUSES: { value: BookingRequestStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "on_hold", label: "On hold (72h)" },
  { value: "confirmed", label: "Confirmed" },
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

export function TeamBookingRequestDetailPage({
  organizationId,
  request,
}: {
  organizationId: string;
  request: {
    id: string;
    reference: string;
    accessType: string;
    productName: string;
    preferredDate: string | null;
    endDate: string | null;
    partySize: number;
    optionLabel: string | null;
    notes: string | null;
    status: BookingRequestStatus;
    holdExpiresAt: string | null;
    availabilitySnapshot: Record<string, unknown>;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
            {request.reference}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {request.productName}
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            {request.accessType === "customer"
              ? "Customer portal request"
              : `${request.accessType} request`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!["on_hold", "confirmed", "cancelled"].includes(request.status) && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await placeTeamBookingRequestHold(organizationId, request.id);
                  router.refresh();
                })
              }
              className="btn-secondary text-xs disabled:opacity-50"
            >
              Place {RESERVATION_HOLD_HOURS}h hold
            </button>
          )}
          <select
          value={request.status}
          disabled={pending}
          onChange={(event) =>
            startTransition(async () => {
              await updateTeamBookingRequestStatus(
                organizationId,
                request.id,
                event.target.value as BookingRequestStatus,
              );
              router.refresh();
            })
          }
          className="input min-w-40 text-xs"
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
        holdExpiresAt={request.holdExpiresAt}
        status={request.status}
      />

      <section className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
        <h2 className="text-sm font-semibold text-white">Request details</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-[#666]">
              Dates
            </dt>
            <dd className="text-white">
              {formatDate(request.preferredDate)}
              {request.endDate && request.endDate !== request.preferredDate
                ? ` → ${formatDate(request.endDate)}`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-[#666]">
              Party size
            </dt>
            <dd className="text-white">{request.partySize}</dd>
          </div>
          {request.optionLabel && (
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-[#666]">
                Option
              </dt>
              <dd className="text-white">{request.optionLabel}</dd>
            </div>
          )}
        </dl>
        {request.notes && (
          <div className="mt-4">
            <dt className="text-[10px] uppercase tracking-wider text-[#666]">
              Notes
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-[#c8c8c0]">
              {request.notes}
            </dd>
          </div>
        )}
      </section>
    </div>
  );
}
