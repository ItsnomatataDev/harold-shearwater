"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import {
  addRatePlan,
  toggleRatePlanActive,
} from "@/features/products/rate-plans-actions";
import type { RatePlan } from "@/features/products/rate-plans-service";
import { Icon } from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";

const TYPE_LABELS: Record<string, string> = {
  public: "Public",
  agent_default: "Agent Default",
  agency_specific: "Agency Specific",
  staff: "Staff",
  promotional: "Promotional",
};

const TYPE_COLORS: Record<string, string> = {
  public: "bg-blue-900/30 text-blue-400",
  agent_default: "bg-purple-900/30 text-purple-400",
  agency_specific: "bg-gold/10 text-[var(--color-gold)]",
  staff: "bg-zinc-700 text-zinc-300",
  promotional: "bg-emerald-900/30 text-emerald-400",
};

export default function TeamRatePlansPage({
  plans,
}: {
  plans: RatePlan[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [formState, formAction, isPending] = useActionState(addRatePlan, {});

  return (
    <div className="shell-content">
      <SectionHeader
        title="Rate Plans"
        subtitle="Control pricing for public, agent and agency-specific bookings."
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Icon name="plus" className="w-4 h-4" />
            New Rate Plan
          </button>
        }
      />

      {plans.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Icon name="dollar" className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            No rate plans yet. Create your first to manage pricing.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-[#1a1a18] rounded-xl border border-zinc-800 p-5 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[plan.plan_type]}`}
                  >
                    {TYPE_LABELS[plan.plan_type]}
                  </span>
                  {!plan.active && (
                    <span className="text-xs text-zinc-500">Inactive</span>
                  )}
                </div>
                <h3 className="font-semibold text-white">{plan.name}</h3>
                {plan.description && (
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {plan.description}
                  </p>
                )}
                {(plan.valid_from || plan.valid_until) && (
                  <p className="text-xs text-zinc-500 mt-1">
                    Valid:{" "}
                    {plan.valid_from
                      ? new Date(plan.valid_from).toLocaleDateString()
                      : "—"}{" "}
                    →{" "}
                    {plan.valid_until
                      ? new Date(plan.valid_until).toLocaleDateString()
                      : "Open"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <form
                  action={toggleRatePlanActive.bind(
                    null,
                    plan.id,
                    !plan.active,
                  )}
                >
                  <button
                    className={`text-xs ${plan.active ? "text-yellow-400 hover:text-yellow-300" : "text-emerald-400 hover:text-emerald-300"}`}
                  >
                    {plan.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
                <Link
                  href={`/admin/products/rates/${plan.id}`}
                  className="btn-ghost text-sm"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex justify-end"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-lg bg-[#111110] border-l border-zinc-800 h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                New Rate Plan
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-zinc-400 hover:text-white"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {formState.success ? (
              <div className="text-center py-12">
                <p className="text-emerald-400 font-medium mb-4">
                  Rate plan created!
                </p>
                <Link
                  href={`/admin/products/rates/${formState.planId}`}
                  className="btn-primary"
                  onClick={() => setShowAdd(false)}
                >
                  Add pricing items
                </Link>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                {formState.error && (
                  <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded">
                    {formState.error}
                  </p>
                )}

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Name *
                  </label>
                  <input
                    name="name"
                    required
                    className="input w-full"
                    placeholder="e.g. Agent Rack Rate 2025"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Type *
                  </label>
                  <select name="plan_type" className="input w-full">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    className="input w-full"
                    rows={2}
                    placeholder="Optional notes"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Valid From
                    </label>
                    <input
                      name="valid_from"
                      type="date"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Valid Until
                    </label>
                    <input
                      name="valid_until"
                      type="date"
                      className="input w-full"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary flex-1"
                  >
                    {isPending ? "Saving…" : "Create Rate Plan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
