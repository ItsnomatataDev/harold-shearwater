"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addRatePlanItem,
  assignRatePlanToAgency,
  deleteRatePlanItem,
  removeRatePlanAssignment,
} from "@/features/products/rate-plans-actions";
import type {
  AgencyAssignment,
  AgentRateAccount,
  RatePlanWithItems,
} from "@/features/products/rate-plans-service";
import type { Product } from "@/features/products/products-service";
import { Icon } from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";

export default function TeamRatePlanDetailPage({
  plan,
  products,
  agents,
  assignments,
}: {
  plan: RatePlanWithItems;
  products: Product[];
  agents: AgentRateAccount[];
  assignments: AgencyAssignment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddItem(formData: FormData) {
    const result = await addRatePlanItem(plan.id, formData);
    if (result.error) setError(result.error);
    else setAddOpen(false);
  }

  return (
    <div className="shell-content">
      <SectionHeader
        title={plan.name}
        subtitle={plan.description ?? "Rate plan pricing"}
        action={
          <div className="flex gap-3">
            <button
              onClick={() => setAddOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add Item
            </button>
            <Link href="/admin/products/rates" className="btn-ghost text-sm">
              ← Rate Plans
            </Link>
          </div>
        }
      />

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded mb-4">
          {error}
        </p>
      )}

      <section className="mt-6 rounded-xl border border-zinc-800 bg-[#1a1a18] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Agent assignments</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Only assigned agents can see this contracted rate plan.
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const membershipId = String(new FormData(event.currentTarget).get("membershipId") ?? "");
              if (!membershipId) return;
              startTransition(async () => {
                const result = await assignRatePlanToAgency(membershipId, plan.id);
                if (result.error) setError(result.error);
                else router.refresh();
              });
            }}
          >
            <select name="membershipId" required className="input min-w-56 text-xs">
              <option value="">Select an agent</option>
              {agents
                .filter((agent) => !assignments.some((assignment) => assignment.membership_id === agent.membershipId))
                .map((agent) => (
                  <option key={agent.membershipId} value={agent.membershipId}>
                    {agent.agencyName} — {agent.name}
                  </option>
                ))}
            </select>
            <button disabled={pending} className="rounded-lg bg-gold px-4 text-xs font-semibold text-black disabled:opacity-40">
              Assign
            </button>
          </form>
        </div>
        {assignments.length ? (
          <ul className="mt-4 divide-y divide-zinc-800 border-t border-zinc-800">
            {assignments.map((assignment) => {
              const agent = agents.find((item) => item.membershipId === assignment.membership_id);
              return (
                <li key={assignment.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-xs font-semibold text-white">{agent?.agencyName ?? "Agent agency"}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">{agent?.name ?? assignment.membership_id}</p>
                  </div>
                  <button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await removeRatePlanAssignment(assignment.id);
                        if (result.error) setError(result.error);
                        else router.refresh();
                      })
                    }
                    className="text-xs text-zinc-500 hover:text-red-400 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 border-t border-zinc-800 pt-4 text-xs text-zinc-500">No agents assigned yet.</p>
        )}
      </section>

      {plan.items.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Icon name="dollar" className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            No pricing items yet. Add products with their prices.
          </p>
          <button onClick={() => setAddOpen(true)} className="btn-primary mt-4">
            Add first item
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Variant</th>
                <th className="text-right px-4 py-3">Price / Person</th>
                <th className="text-left px-4 py-3">Currency</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {item.product_name ?? item.product_id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {item.variant_name ?? (
                      <span className="text-zinc-600">Any</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {item.price_per_person.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{item.currency}</td>
                  <td className="px-4 py-3 text-right">
                    <form
                      action={deleteRatePlanItem.bind(null, plan.id, item.id)}
                    >
                      <button className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex justify-end"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#111110] border-l border-zinc-800 h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                Add Pricing Item
              </h2>
              <button
                onClick={() => setAddOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <form action={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Product *
                </label>
                <select name="product_id" required className="input w-full">
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Variant (optional)
                </label>
                <input
                  name="variant_id"
                  className="input w-full"
                  placeholder="Variant UUID — leave blank for all variants"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Price per Person *
                  </label>
                  <input
                    name="price_per_person"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="input w-full"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Currency
                  </label>
                  <input
                    name="currency"
                    maxLength={3}
                    defaultValue="USD"
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Notes
                </label>
                <input
                  name="notes"
                  className="input w-full"
                  placeholder="Optional notes"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="submit" className="btn-primary flex-1">
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
