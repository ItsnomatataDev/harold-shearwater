"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { AddDealModal, STAGE_META } from "./DealsPage";
import { updateCrmDealStage, deleteCrmDeal } from "../deals-actions";
import type { CrmDeal, DealStage } from "../deals-service";
import type { CrmContact } from "../contacts-service";

function formatCurrency(value: number | null, currency: string) {
  if (value === null) return null;
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

export function ContactDeals({
  organizationId,
  contact,
  initialDeals,
  contacts,
}: {
  organizationId: string;
  contact: CrmContact;
  initialDeals: CrmDeal[];
  contacts: CrmContact[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [showAdd, setShowAdd] = useState(false);
  const [, startTransition] = useTransition();

  function handleStageChange(id: string, stage: DealStage) {
    setDeals((prev) => prev.map((d) => (d.id === id ? { ...d, stage } : d)));
    startTransition(async () => {
      await updateCrmDealStage(organizationId, id, stage, contact.id);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this deal?")) return;
    setDeals((prev) => prev.filter((d) => d.id !== id));
    startTransition(async () => {
      await deleteCrmDeal(organizationId, id, contact.id);
    });
  }

  const totalValue = deals
    .filter((d) => d.stage !== "lost" && d.value !== null)
    .reduce((s, d) => s + (d.value ?? 0), 0);

  return (
    <div className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18]">
      <div className="flex items-center justify-between border-b border-[#2e2e2b] px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-white">Deals</h2>
          {deals.length > 0 && (
            <span className="rounded-full bg-[#2a2a27] px-2 py-0.5 text-[10px] text-[#666]">
              {deals.length}
            </span>
          )}
          {totalValue > 0 && (
            <span className="text-[11px] font-semibold text-savannah">
              {formatCurrency(totalValue, "USD")}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs font-semibold text-victoria hover:underline"
        >
          + New Deal
        </button>
      </div>

      {deals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Icon name="deals" className="h-7 w-7 text-[#333]" />
          <p className="text-sm font-semibold text-[#555]">No deals yet</p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs font-semibold text-victoria hover:underline"
          >
            Create first deal
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-[#232320]">
          {deals.map((deal) => {
            const meta = STAGE_META.find((s) => s.value === deal.stage)!;
            return (
              <li key={deal.id} className="flex items-start gap-4 px-5 py-3">
                <div
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.bg}`}
                >
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-white">
                      {deal.title}
                    </p>
                    {deal.value !== null && (
                      <span className="text-xs font-bold text-[#ccc]">
                        {formatCurrency(deal.value, deal.currency)}
                      </span>
                    )}
                    <span
                      className={`ml-auto text-[9px] font-bold uppercase tracking-wider ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    {deal.closeDate && (
                      <span className="text-[10px] text-[#555]">
                        Close: {formatDate(deal.closeDate)}
                      </span>
                    )}
                    {/* Stage move buttons */}
                    <div className="flex gap-1">
                      {STAGE_META.filter(
                        (s) => s.value !== deal.stage && s.value !== "lost",
                      ).map((s) => (
                        <button
                          key={s.value}
                          onClick={() => handleStageChange(deal.id, s.value)}
                          className="rounded border border-[#2a2a27] px-1.5 py-0.5 text-[9px] text-[#555] hover:text-[#aaa]"
                        >
                          → {s.label}
                        </button>
                      ))}
                      {deal.stage !== "lost" && (
                        <button
                          onClick={() => handleStageChange(deal.id, "lost")}
                          className="rounded border border-[#2a2a27] px-1.5 py-0.5 text-[9px] text-[#444] hover:text-[#c05050]"
                        >
                          Lost
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(deal.id)}
                      className="ml-auto text-[#333] hover:text-[#c05050]"
                    >
                      <Icon name="close" className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showAdd && (
        <AddDealModal
          organizationId={organizationId}
          contacts={contacts}
          defaultContactId={contact.id}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
