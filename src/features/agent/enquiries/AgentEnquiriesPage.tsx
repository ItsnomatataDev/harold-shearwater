"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { addAgentEnquiry, updateEnquiryStatus } from "./enquiries-actions";
import type { AgentEnquiry, EnquiryStatus } from "./enquiries-service";

const STATUS_META: {
  value: EnquiryStatus;
  label: string;
  color: string;
  bg: string;
}[] = [
  { value: "new", label: "New", color: "text-[#aaa]", bg: "bg-[#2a2a27]" },
  {
    value: "qualifying",
    label: "Qualifying",
    color: "text-earth",
    bg: "bg-earth/10",
  },
  {
    value: "quote_requested",
    label: "Quote requested",
    color: "text-victoria",
    bg: "bg-victoria/10",
  },
  {
    value: "quoted",
    label: "Quoted",
    color: "text-victoria",
    bg: "bg-victoria/10",
  },
  {
    value: "reservation_requested",
    label: "Reservation requested",
    color: "text-gold",
    bg: "bg-gold/10",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    color: "text-savannah",
    bg: "bg-savannah/10",
  },
  {
    value: "complete",
    label: "Complete",
    color: "text-gold",
    bg: "bg-gold/10",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    color: "text-[#555]",
    bg: "bg-[#232320]",
  },
];

function AddEnquiryModal({
  organizationId,
  onClose,
}: {
  organizationId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    partySize: "1",
    productInterest: "",
    requestedDate: "",
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addAgentEnquiry(organizationId, form);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add enquiry.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#343431] bg-[#1a1a18] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#343431] px-6 py-4">
          <h2 className="text-sm font-semibold text-white">New Enquiry</h2>
          <button onClick={onClose} className="text-[#666] hover:text-white">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={submit}
          className="max-h-[80vh] space-y-4 overflow-y-auto p-6"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Client Name *
              </label>
              <input
                className="input w-full"
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Email
              </label>
              <input
                type="email"
                className="input w-full"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Phone
              </label>
              <input
                className="input w-full"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Party Size
              </label>
              <input
                type="number"
                min="1"
                className="input w-full"
                value={form.partySize}
                onChange={(e) => set("partySize", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Requested Date
              </label>
              <input
                type="date"
                className="input w-full"
                value={form.requestedDate}
                onChange={(e) => set("requestedDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Activity Interest
            </label>
            <input
              className="input w-full"
              value={form.productInterest}
              onChange={(e) => set("productInterest", e.target.value)}
              placeholder="e.g. Helicopter flight, Bungee combo"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Notes
            </label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-sunset/10 px-3 py-2 text-xs text-[#f18a77]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#3b3b38] px-4 py-2 text-xs text-[#999] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
            >
              {pending ? "Saving…" : "Add Enquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AgentEnquiriesPage({
  organizationId,
  initialEnquiries,
}: {
  organizationId: string;
  initialEnquiries: AgentEnquiry[];
}) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return enquiries.filter((e) => {
      const matchSearch =
        !q ||
        e.contactName.toLowerCase().includes(q) ||
        e.contactEmail?.toLowerCase().includes(q) ||
        e.productInterest?.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [enquiries, search, statusFilter]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: enquiries.length };
    for (const s of STATUS_META)
      m[s.value] = enquiries.filter((e) => e.status === s.value).length;
    return m;
  }, [enquiries]);

  function handleStatusChange(id: string, status: EnquiryStatus) {
    const previousStatus = enquiries.find((enquiry) => enquiry.id === id)?.status;
    setActionError(null);
    setEnquiries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status } : e)),
    );
    startTransition(async () => {
      try {
        await updateEnquiryStatus(organizationId, id, status);
      } catch (cause) {
        if (previousStatus) {
          setEnquiries((prev) =>
            prev.map((enquiry) =>
              enquiry.id === id ? { ...enquiry, status: previousStatus } : enquiry,
            ),
          );
        }
        setActionError(
          cause instanceof Error ? cause.message : "Unable to update enquiry status.",
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      {actionError ? (
        <p className="rounded-xl bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {actionError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555]"
          />
          <input
            className="input w-full pl-9"
            placeholder="Search by name, email or activity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-black"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          New Enquiry
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#2e2e2b] bg-[#181816] p-1">
        {(["all", ...STATUS_META.map((s) => s.value)] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as EnquiryStatus | "all")}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
              statusFilter === s
                ? "bg-[#2e2e2b] text-white"
                : "text-[#666] hover:text-[#aaa]"
            }`}
          >
            {s === "all"
              ? "All"
              : STATUS_META.find((m) => m.value === s)?.label}
            <span className="rounded-full bg-[#333] px-1.5 py-0.5 text-[9px] text-[#888]">
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-[#2e2e2b] bg-[#181816]">
          <Icon name="route" className="h-8 w-8 text-[#444]" />
          <p className="text-sm font-semibold text-[#555]">
            {search || statusFilter !== "all"
              ? "No enquiries match"
              : "No enquiries yet"}
          </p>
          {!search && statusFilter === "all" && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs font-semibold text-gold hover:underline"
            >
              Add your first enquiry
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#2e2e2b]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e2b] bg-[#181816]">
                <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555]">
                  Client
                </th>
                <th className="hidden px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555] md:table-cell">
                  Activity
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
              {filtered.map((e) => {
                const meta = STATUS_META.find((s) => s.value === e.status)!;
                return (
                  <tr key={e.id} className="hover:bg-[#1e1e1c]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/agent/enquiries/${e.id}`}
                        className="text-xs font-semibold text-white hover:text-gold"
                      >
                        {e.contactName}
                      </Link>
                      <p className="text-[10px] text-[#555]">
                        {e.reference} · {e.contactEmail ??
                          e.contactPhone ??
                          `${e.partySize} guests`}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <p className="text-xs text-[#888]">
                        {e.productInterest ?? "—"}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <p className="text-xs text-[#777]">
                        {e.requestedDate
                          ? new Date(e.requestedDate).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={e.status}
                        onChange={(ev) =>
                          handleStatusChange(
                            e.id,
                            ev.target.value as EnquiryStatus,
                          )
                        }
                        className={`rounded-full border-0 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider outline-none ${meta.bg} ${meta.color}`}
                      >
                        {STATUS_META.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddEnquiryModal
          organizationId={organizationId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
