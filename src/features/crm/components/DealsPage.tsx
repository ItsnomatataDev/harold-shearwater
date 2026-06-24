"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  addCrmDeal,
  updateCrmDealStage,
  deleteCrmDeal,
} from "../deals-actions";
import type { CrmDeal, DealStage } from "../deals-service";
import type { CrmContact } from "../contacts-service";

// ─── Constants ───────────────────────────────────────────────────────────────

export const STAGE_META: {
  value: DealStage;
  label: string;
  color: string;
  bg: string;
  dot: string;
}[] = [
  {
    value: "enquiry",
    label: "Enquiry",
    color: "text-[#aaa]",
    bg: "bg-[#252522]",
    dot: "bg-[#555]",
  },
  {
    value: "quoted",
    label: "Quoted",
    color: "text-victoria",
    bg: "bg-victoria/10",
    dot: "bg-victoria",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    color: "text-savannah",
    bg: "bg-savannah/10",
    dot: "bg-savannah",
  },
  {
    value: "complete",
    label: "Complete",
    color: "text-gold",
    bg: "bg-gold/10",
    dot: "bg-gold",
  },
  {
    value: "lost",
    label: "Lost",
    color: "text-[#666]",
    bg: "bg-[#232320]",
    dot: "bg-[#444]",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number | null, currency: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Add Deal Modal ───────────────────────────────────────────────────────────

export function AddDealModal({
  organizationId,
  contacts,
  defaultContactId,
  onClose,
}: {
  organizationId: string;
  contacts: CrmContact[];
  defaultContactId?: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    contactId: defaultContactId ?? contacts[0]?.id ?? "",
    title: "",
    value: "",
    currency: "USD",
    stage: "enquiry" as DealStage,
    closeDate: "",
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
        await addCrmDeal(organizationId, form);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add deal.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#343431] bg-[#1a1a18] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#343431] px-6 py-4">
          <h2 className="text-sm font-semibold text-white">New Deal</h2>
          <button onClick={onClose} className="text-[#666] hover:text-white">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={submit}
          className="max-h-[80vh] space-y-4 overflow-y-auto p-6"
        >
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Contact *
            </label>
            <select
              className="input w-full"
              value={form.contactId}
              onChange={(e) => set("contactId", e.target.value)}
              required
            >
              <option value="">— Select contact —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Deal Title *
            </label>
            <input
              className="input w-full"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Victoria Falls Adventure Package"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Value
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input w-full"
                value={form.value}
                onChange={(e) => set("value", e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Currency
              </label>
              <select
                className="input w-full"
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
              >
                {["USD", "ZWL", "ZAR", "EUR", "GBP"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Stage
              </label>
              <select
                className="input w-full"
                value={form.stage}
                onChange={(e) => set("stage", e.target.value)}
              >
                {STAGE_META.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Expected Close
              </label>
              <input
                type="date"
                className="input w-full"
                value={form.closeDate}
                onChange={(e) => set("closeDate", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Notes
            </label>
            <textarea
              className="input w-full resize-none"
              rows={2}
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
              className="rounded-lg bg-victoria px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Add Deal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Deal Card ────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  organizationId,
  onStageChange,
  onDelete,
}: {
  deal: CrmDeal;
  organizationId: string;
  onStageChange: (id: string, stage: DealStage) => void;
  onDelete: (id: string) => void;
}) {
  const [, startTransition] = useTransition();
  function moveStage(newStage: DealStage) {
    onStageChange(deal.id, newStage);
    startTransition(async () => {
      await updateCrmDealStage(
        organizationId,
        deal.id,
        newStage,
        deal.contactId,
      );
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${deal.title}"?`)) return;
    onDelete(deal.id);
    startTransition(async () => {
      await deleteCrmDeal(organizationId, deal.id, deal.contactId);
    });
  }

  return (
    <div className="group rounded-xl border border-[#2e2e2b] bg-[#1e1e1c] p-3 shadow-sm transition hover:border-[#3e3e3a]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-snug text-white">
          {deal.title}
        </p>
        <button
          onClick={handleDelete}
          className="shrink-0 text-[#333] opacity-0 transition hover:text-[#c05050] group-hover:opacity-100"
        >
          <Icon name="close" className="h-3 w-3" />
        </button>
      </div>
      <Link
        href={`/team/crm/${deal.contactId}`}
        className="mt-1 block text-[10px] text-[#555] hover:text-victoria"
      >
        {deal.contactName}
      </Link>
      {deal.value !== null && (
        <p className="mt-2 text-sm font-bold text-white">
          {formatCurrency(deal.value, deal.currency)}
        </p>
      )}
      {deal.closeDate && (
        <p className="mt-1 text-[10px] text-[#555]">
          Close: {formatDate(deal.closeDate)}
        </p>
      )}
      {/* Stage move buttons */}
      <div className="mt-3 flex gap-1">
        {STAGE_META.filter(
          (s) => s.value !== deal.stage && s.value !== "lost",
        ).map((s) => (
          <button
            key={s.value}
            onClick={() => moveStage(s.value)}
            className="rounded-md border border-[#2e2e2b] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#666] hover:border-[#555] hover:text-[#aaa]"
          >
            → {s.label}
          </button>
        ))}
        {deal.stage !== "lost" && (
          <button
            onClick={() => moveStage("lost")}
            className="ml-auto rounded-md border border-[#2e2e2b] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#444] hover:text-[#c05050]"
          >
            Lost
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

function KanbanBoard({
  deals,
  organizationId,
  onStageChange,
  onDelete,
}: {
  deals: CrmDeal[];
  organizationId: string;
  onStageChange: (id: string, stage: DealStage) => void;
  onDelete: (id: string) => void;
}) {
  const dragId = useRef<string | null>(null);

  function handleDragStart(id: string) {
    dragId.current = id;
  }

  function handleDrop(stage: DealStage) {
    if (!dragId.current) return;
    const deal = deals.find((d) => d.id === dragId.current);
    if (deal && deal.stage !== stage) {
      onStageChange(dragId.current, stage);
    }
    dragId.current = null;
  }

  const byStage = useMemo(() => {
    const map = new Map<DealStage, CrmDeal[]>();
    for (const s of STAGE_META) map.set(s.value, []);
    for (const d of deals) map.get(d.stage)?.push(d);
    return map;
  }, [deals]);

  const totalValue = deals
    .filter((d) => d.stage !== "lost" && d.value !== null)
    .reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="space-y-3">
      {totalValue > 0 && (
        <p className="text-[11px] font-semibold text-[#666]">
          Pipeline value:{" "}
          <span className="text-savannah">
            {formatCurrency(totalValue, "USD")}
          </span>
        </p>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGE_META.map((stage) => {
          const cards = byStage.get(stage.value) ?? [];
          const colValue = cards
            .filter((d) => d.value !== null)
            .reduce((s, d) => s + (d.value ?? 0), 0);
          return (
            <div
              key={stage.value}
              className="flex w-64 shrink-0 flex-col rounded-2xl border border-[#2e2e2b] bg-[#191918]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(stage.value)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between rounded-t-2xl border-b border-[#2e2e2b] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${stage.color}`}
                  >
                    {stage.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {colValue > 0 && (
                    <span className="text-[9px] text-[#555]">
                      {formatCurrency(colValue, "USD")}
                    </span>
                  )}
                  <span className="rounded-full bg-[#2a2a27] px-1.5 py-0.5 text-[9px] text-[#666]">
                    {cards.length}
                  </span>
                </div>
              </div>
              {/* Cards */}
              <div className="flex flex-col gap-2 p-2">
                {cards.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => handleDragStart(deal.id)}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <DealCard
                      deal={deal}
                      organizationId={organizationId}
                      onStageChange={onStageChange}
                      onDelete={onDelete}
                    />
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-[#2a2a27]">
                    <span className="text-[10px] text-[#333]">Empty</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function DealsList({
  deals,
  organizationId,
  onStageChange,
  onDelete,
}: {
  deals: CrmDeal[];
  organizationId: string;
  onStageChange: (id: string, stage: DealStage) => void;
  onDelete: (id: string) => void;
}) {
  const [stageFilter, setStageFilter] = useState<DealStage | "all">("all");
  const [, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      stageFilter === "all"
        ? deals
        : deals.filter((d) => d.stage === stageFilter),
    [deals, stageFilter],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: deals.length };
    for (const s of STAGE_META)
      m[s.value] = deals.filter((d) => d.stage === s.value).length;
    return m;
  }, [deals]);

  function handleDelete(id: string, contactId: string) {
    if (!confirm("Delete this deal?")) return;
    onDelete(id);
    startTransition(async () => {
      await deleteCrmDeal(organizationId, id, contactId);
    });
  }

  return (
    <div className="space-y-4">
      {/* Stage tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#2e2e2b] bg-[#181816] p-1">
        {(["all", ...STAGE_META.map((s) => s.value)] as const).map((s) => {
          const meta =
            s !== "all" ? STAGE_META.find((m) => m.value === s) : null;
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s as DealStage | "all")}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                stageFilter === s
                  ? "bg-[#2e2e2b] text-white"
                  : "text-[#666] hover:text-[#aaa]"
              }`}
            >
              {meta && (
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              )}
              {s === "all" ? "All" : meta?.label}
              <span className="rounded-full bg-[#333] px-1.5 py-0.5 text-[9px] text-[#888]">
                {counts[s] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-[#2e2e2b] bg-[#181816]">
          <p className="text-sm font-semibold text-[#444]">
            No deals in this stage
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#2e2e2b]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e2b] bg-[#181816]">
                <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555]">
                  Deal
                </th>
                <th className="hidden px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555] sm:table-cell">
                  Contact
                </th>
                <th className="hidden px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555] md:table-cell">
                  Value
                </th>
                <th className="hidden px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555] lg:table-cell">
                  Close Date
                </th>
                <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555]">
                  Stage
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232320] bg-[#1a1a18]">
              {filtered.map((deal) => {
                const meta = STAGE_META.find((s) => s.value === deal.stage)!;
                return (
                  <tr key={deal.id} className="hover:bg-[#1e1e1c]">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-white">
                        {deal.title}
                      </p>
                      {deal.ownerName && (
                        <p className="text-[10px] text-[#555]">
                          {deal.ownerName}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Link
                        href={`/team/crm/${deal.contactId}`}
                        className="text-xs text-[#888] hover:text-victoria"
                      >
                        {deal.contactName}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className="text-xs font-semibold text-white">
                        {formatCurrency(deal.value, deal.currency)}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <span className="text-xs text-[#777]">
                        {formatDate(deal.closeDate) ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={deal.stage}
                        onChange={(e) => {
                          const s = e.target.value as DealStage;
                          onStageChange(deal.id, s);
                          startTransition(async () => {
                            await updateCrmDealStage(
                              organizationId,
                              deal.id,
                              s,
                              deal.contactId,
                            );
                          });
                        }}
                        className={`rounded-full border-0 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider outline-none ${meta.bg} ${meta.color}`}
                      >
                        {STAGE_META.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(deal.id, deal.contactId)}
                        className="text-[#333] hover:text-[#c05050]"
                      >
                        <Icon name="close" className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main DealsPage ───────────────────────────────────────────────────────────

export function DealsPage({
  organizationId,
  initialDeals,
  contacts,
}: {
  organizationId: string;
  initialDeals: CrmDeal[];
  contacts: CrmContact[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [showAdd, setShowAdd] = useState(false);

  function handleStageChange(id: string, stage: DealStage) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
  }

  function handleDelete(id: string) {
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View toggle */}
        <div className="flex rounded-xl border border-[#2e2e2b] bg-[#181816] p-1">
          {(["kanban", "list"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                view === v
                  ? "bg-[#2e2e2b] text-white"
                  : "text-[#555] hover:text-[#aaa]"
              }`}
            >
              {v === "kanban" ? "Board" : "List"}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-xl bg-victoria px-4 py-2 text-xs font-semibold text-white"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            New Deal
          </button>
        </div>
      </div>

      {deals.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-[#2e2e2b] bg-[#181816]">
          <Icon name="deals" className="h-8 w-8 text-[#333]" />
          <p className="text-sm font-semibold text-[#555]">No deals yet</p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs font-semibold text-victoria hover:underline"
          >
            Create your first deal
          </button>
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard
          deals={deals}
          organizationId={organizationId}
          onStageChange={handleStageChange}
          onDelete={handleDelete}
        />
      ) : (
        <DealsList
          deals={deals}
          organizationId={organizationId}
          onStageChange={handleStageChange}
          onDelete={handleDelete}
        />
      )}

      {showAdd && (
        <AddDealModal
          organizationId={organizationId}
          contacts={contacts}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
