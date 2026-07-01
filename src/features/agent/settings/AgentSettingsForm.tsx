"use client";

import { useState, useTransition } from "react";
import {
  refreshAgentGoldenDuskProfileAction,
  saveAgentSettings,
} from "./settings-actions";
import type { AgentGoldenDuskProfileView } from "@/features/agent/profile/agent-display-profile";

interface SettingsDefaults {
  firstName: string;
  lastName: string;
  phone: string;
  agencyName: string;
  website: string;
}

export function AgentSettingsForm({
  userId,
  defaults,
  goldenDusk,
}: {
  userId: string;
  defaults: SettingsDefaults;
  goldenDusk: AgentGoldenDuskProfileView | null;
}) {
  void userId;

  const [pending, startTransition] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(defaults);
  const [bookingProfile, setBookingProfile] = useState(goldenDusk);

  function set(field: keyof SettingsDefaults, value: string) {
    setSaved(false);
    setMessage(null);
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setMessage(null);
    startTransition(async () => {
      try {
        await saveAgentSettings(form);
        setSaved(true);
        setMessage(
          bookingProfile?.connected
            ? "Portal profile saved. If your name or agency differs from SWAIBMS, the Shearwater team has been notified."
            : "Settings saved successfully.",
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      {bookingProfile?.connected && (
        <section className="rounded-2xl border border-emerald-700/30 bg-emerald-900/10 p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                From your booking account (SWAIBMS)
              </h2>
              <p className="mt-0.5 text-xs text-[#8aa892]">
                Loaded from GoldenDusk when you sign in. This is what bookings
                and rates use.
              </p>
            </div>
            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                startRefresh(async () => {
                  setError(null);
                  try {
                    const refreshed = await refreshAgentGoldenDuskProfileAction();
                    if (refreshed) setBookingProfile(refreshed);
                    setMessage("Booking profile refreshed from SWAIBMS.");
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Unable to refresh booking profile.",
                    );
                  }
                })
              }
              className="rounded-lg border border-emerald-700/40 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-200 hover:bg-emerald-900/20"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            <ProfileFact label="Agent name" value={bookingProfile.fullName} />
            <ProfileFact label="Email" value={bookingProfile.email} />
            <ProfileFact label="Agency" value={bookingProfile.agencyName} />
            <ProfileFact
              label="Consultant"
              value={bookingProfile.consultantName}
            />
            <ProfileFact
              label="Currency"
              value={bookingProfile.currencyCode}
            />
          </dl>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-6 space-y-5"
      >
        <div className="border-b border-[#2e2e2b] pb-4">
          <h2 className="text-sm font-semibold text-white">
            Shearwater portal profile
          </h2>
          <p className="mt-0.5 text-xs text-[#666]">
            Used inside Harold and the agent portal. You can edit these any
            time. Changes that differ from SWAIBMS notify the Shearwater team.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Agency / Company Name *
          </label>
          <input
            className="input w-full"
            value={form.agencyName}
            onChange={(e) => set("agencyName", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Agency Website
          </label>
          <input
            type="url"
            className="input w-full"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://youragency.com"
          />
        </div>

        <div className="border-t border-[#2e2e2b] pt-5">
          <h3 className="mb-4 text-xs font-semibold text-[#888]">
            Contact Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                First Name *
              </label>
              <input
                className="input w-full"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Last Name *
              </label>
              <input
                className="input w-full"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Phone
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
          <p className="rounded-xl border border-sunset/20 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
            {error}
          </p>
        )}
        {saved && message && (
          <p className="rounded-xl border border-savannah/20 bg-savannah/10 px-4 py-3 text-xs text-savannah">
            {message}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-gold px-6 py-2.5 text-xs font-semibold text-black disabled:opacity-40 transition hover:opacity-90"
          >
            {pending ? "Saving…" : "Save portal profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProfileFact({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-emerald-800/20 bg-[#10100f] px-4 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#6f8f6a]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white">{value?.trim() || "—"}</dd>
    </div>
  );
}
