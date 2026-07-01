"use client";

import Link from "next/link";
import type { RatePlanWithItems } from "@/features/products/rate-plans-service";
import { Icon } from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";

const TYPE_LABELS: Record<string, string> = {
  public: "Public",
  agent_default: "Standard agent",
  agency_specific: "Agency contract",
  staff: "Staff",
  promotional: "Promotional",
};

const TYPE_COLORS: Record<string, string> = {
  public: "bg-blue-900/30 text-blue-400",
  agent_default: "bg-purple-900/30 text-purple-400",
  agency_specific: "bg-gold/10 text-gold",
  staff: "bg-zinc-700 text-zinc-300",
  promotional: "bg-emerald-900/30 text-emerald-400",
};

function formatDate(value: string | null) {
  if (!value) return "Open";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AgentRatesPage({
  ratePlans,
  agencyName,
}: {
  ratePlans: RatePlanWithItems[];
  agencyName: string;
}) {
  const totalPrices = ratePlans.reduce((sum, plan) => sum + plan.items.length, 0);

  return (
    <div className="shell-content">
      <SectionHeader
        title="Your rates"
        subtitle={
          totalPrices === 0
            ? `Contracted pricing for ${agencyName} — no rate plans assigned yet.`
            : `${ratePlans.length} rate plan${ratePlans.length !== 1 ? "s" : ""} · ${totalPrices} product price${totalPrices !== 1 ? "s" : ""} for ${agencyName}`
        }
      />

      <div className="mb-6 rounded-2xl border border-gold/20 bg-gold/5 px-4 py-3 text-xs leading-5 text-[#b8a56a]">
        <p className="font-semibold text-gold">Agency pricing only</p>
        <p className="mt-1 text-[#9a8f6e]">
          These are the contracted rates for your travel agency — not guest retail
          prices. You only see plans assigned to your agency plus standard agent
          rates. Other agencies cannot see your negotiated pricing.
        </p>
      </div>

      {ratePlans.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-[#1a1a18] py-16 text-center">
          <Icon name="dollar" className="mx-auto mb-3 h-10 w-10 opacity-40 text-zinc-500" />
          <p className="text-sm font-medium text-white">No rates available yet</p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-zinc-500">
            Shearwater will assign your agency contract or standard agent rates
            after approval. Browse products in the meantime — rates will appear here
            once linked.
          </p>
          <Link
            href="/agent/products"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-gold/30 px-4 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10"
          >
            <Icon name="package" className="h-3.5 w-3.5" />
            View product catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {ratePlans.map((plan) => (
            <section
              key={plan.id}
              className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#1a1a18]"
            >
              <div className="border-b border-zinc-800 px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base font-semibold text-white">{plan.name}</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TYPE_COLORS[plan.plan_type] ?? "bg-zinc-800 text-zinc-400"}`}
                  >
                    {TYPE_LABELS[plan.plan_type] ?? plan.plan_type}
                  </span>
                  {!plan.active && (
                    <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                      Inactive
                    </span>
                  )}
                </div>
                {plan.description ? (
                  <p className="mt-2 text-xs text-zinc-500">{plan.description}</p>
                ) : null}
                <p className="mt-2 text-[10px] text-zinc-600">
                  Valid {formatDate(plan.valid_from)} — {formatDate(plan.valid_until)}
                </p>
              </div>

              {plan.items.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs text-zinc-500">
                  No product prices in this plan yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Product</th>
                        <th className="px-5 py-3 font-semibold">Variant</th>
                        <th className="px-5 py-3 font-semibold text-right">
                          Per person
                        </th>
                        <th className="px-5 py-3 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {plan.items.map((item) => (
                        <tr key={item.id} className="text-xs">
                          <td className="px-5 py-3.5 font-medium text-white">
                            {item.product_name ?? "Product"}
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400">
                            {item.variant_name ?? "—"}
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold text-gold">
                            {item.currency} {item.price_per_person.toFixed(2)}
                          </td>
                          <td className="max-w-xs px-5 py-3.5 text-zinc-500">
                            {item.notes ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
