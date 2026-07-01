"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import type { EnquiryStatus } from "@/features/agent/enquiries/enquiries-service";
import {
  updateTeamBookingRequestStatus,
  updateTeamEnquiryStatus,
} from "./team-bookings-actions";
import type {
  TeamBookingRequest,
  TeamInboxEnquiry,
  BookingRequestStatus,
} from "./team-bookings-service";
import { formatHoldExpiry } from "@/features/booking/reservation-holds";

const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  qualifying: "Qualifying",
  quote_requested: "Quote requested",
  quoted: "Quoted",
  reservation_requested: "Reservation requested",
  on_hold: "On hold",
  confirmed: "Confirmed",
  complete: "Complete",
  cancelled: "Cancelled",
};

const REQUEST_STATUS_LABELS: Record<BookingRequestStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  on_hold: "On hold",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

type InboxFilter = "all" | "agent" | "customer" | "open";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TeamBookingsInboxPage({
  organizationId,
  enquiries,
  requests,
}: {
  organizationId: string;
  enquiries: TeamInboxEnquiry[];
  requests: TeamBookingRequest[];
}) {
  const [filter, setFilter] = useState<InboxFilter>("open");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const items = useMemo(() => {
    const enquiryItems = enquiries.map((item) => ({
      kind: "enquiry" as const,
      id: item.id,
      reference: item.reference,
      title: item.contactName,
      subtitle: item.productInterest ?? "General enquiry",
      source: item.agentAgency
        ? `${item.agentName} · ${item.agentAgency}`
        : item.agentName,
      date: item.requestedDate,
      status: item.status,
      holdExpiresAt: item.holdExpiresAt,
      createdAt: item.createdAt,
      href: `/team/bookings/enquiries/${item.id}`,
      isOpen: !["complete", "cancelled"].includes(item.status),
    }));

    const requestItems = requests.map((item) => ({
      kind: "request" as const,
      id: item.id,
      reference: item.reference,
      title: item.productName,
      subtitle: item.requesterName ?? item.requesterEmail ?? "Customer",
      source: item.accessType === "customer" ? "Customer portal" : item.accessType,
      date: item.preferredDate,
      status: item.status,
      holdExpiresAt: item.holdExpiresAt,
      createdAt: item.createdAt,
      href: `/team/bookings/requests/${item.id}`,
      isOpen: !["confirmed", "cancelled"].includes(item.status),
    }));

    return [...enquiryItems, ...requestItems].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [enquiries, requests]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "open" && item.isOpen) ||
        (filter === "agent" && item.kind === "enquiry") ||
        (filter === "customer" && item.kind === "request");
      const matchesSearch =
        !q ||
        item.reference.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [items, filter, search]);

  function updateStatus(item: (typeof items)[number], nextStatus: string) {
    setError(null);
    startTransition(async () => {
      try {
        if (item.kind === "enquiry") {
          await updateTeamEnquiryStatus(
            organizationId,
            item.id,
            nextStatus as EnquiryStatus,
          );
        } else {
          await updateTeamBookingRequestStatus(
            organizationId,
            item.id,
            nextStatus as BookingRequestStatus,
          );
        }
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to update status.",
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="relative">
        <Icon
          name="search"
          className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555]"
        />
        <input
          className="input w-full pl-9"
          placeholder="Search reference, client, product, agency…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["open", "Open"],
            ["all", "All"],
            ["agent", "Agent enquiries"],
            ["customer", "Customer requests"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              filter === value
                ? "bg-savannah text-black"
                : "border border-[#343431] text-[#85857d] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-[#2e2e2b] bg-[#181816]">
          <Icon name="route" className="h-8 w-8 text-[#444]" />
          <p className="text-sm font-semibold text-[#555]">No booking requests yet</p>
          <p className="max-w-sm text-center text-xs text-[#666]">
            Agent availability requests and customer booking requests will appear
            here for your team to review and confirm.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#2e2e2b]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e2b] bg-[#181816]">
                <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555]">
                  Request
                </th>
                <th className="hidden px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555] md:table-cell">
                  Source
                </th>
                <th className="hidden px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555] sm:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232320] bg-[#1a1a18]">
              {filtered.map((item) => (
                <tr key={`${item.kind}-${item.id}`} className="hover:bg-[#1e1e1c]">
                  <td className="px-4 py-3">
                    <Link
                      href={item.href}
                      className="text-xs font-semibold text-white hover:text-savannah"
                    >
                      {item.title}
                    </Link>
                    <p className="text-[10px] text-[#555]">
                      {item.reference} · {item.subtitle}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="text-xs text-[#888]">{item.source}</p>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="text-xs text-[#777]">{formatDate(item.date)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(event) =>
                        updateStatus(item, event.target.value)
                      }
                      className="input min-w-40 text-[10px] uppercase"
                    >
                      {item.kind === "enquiry"
                        ? Object.entries(ENQUIRY_STATUS_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )
                        : Object.entries(REQUEST_STATUS_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ),
                          )}
                    </select>
                    {item.status === "on_hold" && item.holdExpiresAt && (
                      <p className="mt-1 text-[10px] text-gold">
                        {formatHoldExpiry(item.holdExpiresAt)}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
