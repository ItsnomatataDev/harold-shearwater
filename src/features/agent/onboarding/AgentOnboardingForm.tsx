"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeAgentOnboarding } from "./onboarding-actions";
import { Icon } from "@/components/Icon";
import type { AgentGoldenDuskProfileView } from "@/features/agent/profile/agent-display-profile";

export function AgentOnboardingForm({
  name,
  goldenDusk,
}: {
  name: string;
  goldenDusk: AgentGoldenDuskProfileView | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    agencyName: goldenDusk?.agencyName ?? "",
    website: "",
    phone: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await completeAgentOnboarding(form);
        router.refresh(); // layout re-renders: sees agency_name → renders portal
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#111] px-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold text-lg font-bold">
            {name.charAt(0).toUpperCase()}
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
            Agent Portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Set up your travel agency
          </h1>
          <p className="mt-2 text-sm text-[#888]">
            {goldenDusk?.agencyName
              ? "We loaded your agency from SWAIBMS. Confirm or adjust the details below."
              : "Agent Access is for travel companies and tour operators — not individual guests. Tell us about your agency to complete your company profile."}
          </p>
          {goldenDusk?.fullName && (
            <p className="mt-2 text-xs text-emerald-300/80">
              Booking account: {goldenDusk.fullName}
              {goldenDusk.agencyName ? ` · ${goldenDusk.agencyName}` : ""}
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-7 space-y-5"
        >
          {/* Agency name */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Agency / Company Name *
            </label>
            <input
              className="input w-full"
              value={form.agencyName}
              onChange={(e) => set("agencyName", e.target.value)}
              placeholder="Victoria Falls Safaris"
              required
              autoFocus
            />
          </div>

          {/* Website */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Agency Website
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]">
                <Icon name="document" className="h-3.5 w-3.5" />
              </span>
              <input
                type="url"
                className="input w-full pl-9"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://youragency.com"
              />
            </div>
            <p className="mt-1 text-[10px] text-[#555]">
              Include https:// — e.g. https://youragency.com
            </p>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Contact Phone
            </label>
            <input
              type="tel"
              className="input w-full"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+263 77 123 4567"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-sunset/10 border border-sunset/20 px-4 py-3 text-xs text-[#f18a77]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !form.agencyName.trim()}
            className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-black disabled:opacity-40 transition hover:opacity-90"
          >
            {pending ? "Saving…" : "Continue to Agent Portal"}
          </button>
        </form>
      </div>
    </main>
  );
}
