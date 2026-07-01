"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import {
  addEnquiryFollowup,
  addEnquiryNote,
  completeEnquiryFollowup,
  updateEnquiryCommercialDetails,
  updateEnquiryStatus,
} from "./enquiries-actions";
import type {
  AgentEnquiry,
  AgentEnquiryEvent,
  AgentEnquiryFollowup,
  EnquiryStatus,
} from "./enquiries-service";
import { ReservationHoldBanner } from "@/features/booking/ReservationHoldBanner";
import { GoldenDuskBookingSummary } from "@/features/agent/golden-dusk/GoldenDuskBookingSummary";

const STATUSES: { value: EnquiryStatus; label: string }[] = [
  { value: "new", label: "New enquiry" },
  { value: "qualifying", label: "Qualifying" },
  { value: "quote_requested", label: "Quote requested" },
  { value: "quoted", label: "Quoted" },
  { value: "reservation_requested", label: "Reservation requested" },
  { value: "on_hold", label: "On hold (72h)" },
  { value: "confirmed", label: "Confirmed externally" },
  { value: "complete", label: "Travel completed" },
  { value: "cancelled", label: "Cancelled" },
];

const FOLLOWUP_LABELS = {
  general: "General follow-up",
  post_sale: "Post-sale",
  review: "Review request",
  upsell: "Upsell opportunity",
};

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

export function AgentEnquiryDetailPage({
  organizationId,
  enquiry,
  events,
  followups,
}: {
  organizationId: string;
  enquiry: AgentEnquiry;
  events: AgentEnquiryEvent[];
  followups: AgentEnquiryFollowup[];
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
            href="/agent/enquiries"
            className="inline-flex items-center gap-1 text-xs text-[#777] hover:text-white"
          >
            <Icon name="chevronLeft" className="h-3.5 w-3.5" />
            Enquiries
          </Link>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[.16em] text-gold">
            {enquiry.reference}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {enquiry.contactName}
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            {enquiry.productInterest ?? "General Shearwater enquiry"}
          </p>
        </div>
        <select
          value={enquiry.status}
          disabled={pending || enquiry.status === "on_hold"}
          onChange={(event) =>
            run(() =>
              updateEnquiryStatus(
                organizationId,
                enquiry.id,
                event.target.value as EnquiryStatus,
              ),
            )
          }
          className="input min-w-52 text-xs"
          aria-label="Enquiry status"
        >
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </header>

      <ReservationHoldBanner
        holdExpiresAt={enquiry.holdExpiresAt}
        status={enquiry.status}
      />

      <GoldenDuskBookingSummary
        organizationId={organizationId}
        enquiry={enquiry}
        audience="agent"
      />

      {error ? (
        <p className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.85fr)]">
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Party", `${enquiry.partySize} guest${enquiry.partySize === 1 ? "" : "s"}`],
              ["Travel date", formatDate(enquiry.requestedDate)],
              ["Email", enquiry.contactEmail ?? "Not supplied"],
              ["Phone", enquiry.contactPhone ?? "Not supplied"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-4">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#555]">
                  {label}
                </p>
                <p className="mt-2 break-words text-xs font-medium text-[#ddd]">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#2e2e2b] bg-[#1a1a18]">
            <div className="border-b border-[#2e2e2b] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Activity timeline</h2>
              <p className="mt-1 text-[10px] text-[#555]">
                Notes, status changes and future email activity stay attached to this case.
              </p>
            </div>
            <form
              className="border-b border-[#2e2e2b] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!note.trim()) return;
                run(
                  () =>
                    addEnquiryNote(organizationId, {
                      enquiryId: enquiry.id,
                      body: note,
                    }),
                  () => setNote(""),
                );
              }}
            >
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="input w-full resize-none"
                placeholder="Add a client call note, requirement or internal reminder…"
              />
              <div className="mt-2 flex justify-end">
                <button
                  disabled={pending || !note.trim()}
                  className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
                >
                  Add note
                </button>
              </div>
            </form>
            {events.length ? (
              <ul className="divide-y divide-[#252522]">
                {events.map((event) => (
                  <li key={event.id} className="flex gap-3 px-5 py-4">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#292926]">
                      <Icon
                        name={event.eventType === "note" ? "edit" : "route"}
                        className="h-3.5 w-3.5 text-gold"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs leading-5 text-[#d2d2cc]">{event.body}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-wider text-[#555]">
                        {event.eventType.replaceAll("_", " ")} · {formatDate(event.createdAt, true)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-10 text-center text-xs text-[#555]">
                No timeline activity yet.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-5">
            <h2 className="text-sm font-semibold text-white">Quote and reservation</h2>
            <p className="mt-1 text-[10px] leading-4 text-[#555]">
              Store a manual quote or external booking reference now. Live booking will plug into this record later.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                run(() =>
                  updateEnquiryCommercialDetails(organizationId, {
                    enquiryId: enquiry.id,
                    quoteAmount: form.get("quoteAmount") || undefined,
                    quoteCurrency: form.get("quoteCurrency"),
                    externalBookingReference:
                      form.get("externalBookingReference") || undefined,
                    followUpAt: form.get("followUpAt") || undefined,
                  }),
                );
              }}
            >
              <div className="grid grid-cols-[1fr_82px] gap-2">
                <input
                  name="quoteAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={enquiry.quoteAmount ?? ""}
                  className="input"
                  placeholder="Quote amount"
                />
                <input
                  name="quoteCurrency"
                  defaultValue={enquiry.quoteCurrency}
                  maxLength={3}
                  className="input uppercase"
                  aria-label="Quote currency"
                />
              </div>
              <input
                name="externalBookingReference"
                defaultValue={enquiry.externalBookingReference ?? ""}
                className="input w-full"
                placeholder="External booking reference"
              />
              <label className="block">
                <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-[#555]">
                  Next follow-up
                </span>
                <input
                  name="followUpAt"
                  type="datetime-local"
                  defaultValue={enquiry.followUpAt?.slice(0, 16) ?? ""}
                  className="input w-full"
                />
              </label>
              <button
                disabled={pending}
                className="w-full rounded-xl border border-[#3a3a36] py-2.5 text-xs font-semibold text-white hover:bg-[#242421] disabled:opacity-40"
              >
                Save commercial details
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18]">
            <div className="border-b border-[#2e2e2b] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Follow-ups</h2>
              <p className="mt-1 text-[10px] text-[#555]">Post-sale, review and upsell actions.</p>
            </div>
            <form
              className="space-y-2 border-b border-[#2e2e2b] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                const element = event.currentTarget;
                const form = new FormData(element);
                run(
                  () =>
                    addEnquiryFollowup(organizationId, {
                      enquiryId: enquiry.id,
                      kind: form.get("kind"),
                      title: form.get("title"),
                      dueAt: form.get("dueAt") || undefined,
                    }),
                  () => element.reset(),
                );
              }}
            >
              <select name="kind" className="input w-full text-xs">
                {Object.entries(FOLLOWUP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <input name="title" required className="input w-full" placeholder="Follow-up action" />
              <div className="flex gap-2">
                <input name="dueAt" type="datetime-local" className="input min-w-0 flex-1" />
                <button disabled={pending} className="rounded-lg bg-[#2b2b28] px-3 text-xs font-semibold text-gold">
                  Add
                </button>
              </div>
            </form>
            {followups.length ? (
              <ul className="divide-y divide-[#252522]">
                {followups.map((followup) => (
                  <li key={followup.id} className="flex items-start gap-3 px-4 py-3">
                    <button
                      disabled={pending || followup.status === "completed"}
                      onClick={() =>
                        run(() =>
                          completeEnquiryFollowup(
                            organizationId,
                            enquiry.id,
                            followup.id,
                          ),
                        )
                      }
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        followup.status === "completed"
                          ? "border-savannah bg-savannah text-[#102018]"
                          : "border-[#555] text-transparent hover:text-gold"
                      }`}
                      aria-label={`Complete ${followup.title}`}
                    >
                      <Icon name="check" className="h-3 w-3" />
                    </button>
                    <div className={followup.status === "completed" ? "opacity-50" : ""}>
                      <p className="text-xs font-medium text-[#ddd]">{followup.title}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-wider text-[#555]">
                        {FOLLOWUP_LABELS[followup.kind]} · {formatDate(followup.dueAt, true)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-xs text-[#555]">No follow-ups scheduled.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
