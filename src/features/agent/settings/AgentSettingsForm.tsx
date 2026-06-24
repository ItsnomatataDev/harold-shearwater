"use client";

import { useState, useTransition } from "react";
import { saveAgentSettings } from "./settings-actions";

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
}: {
  userId: string;
  defaults: SettingsDefaults;
}) {
  // userId kept for future use (e.g. avatar upload)
  void userId;

  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaults);

  function set(field: keyof SettingsDefaults, value: string) {
    setSaved(false);
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await saveAgentSettings(form);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Agency Profile */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-6 space-y-5"
      >
        <div className="border-b border-[#2e2e2b] pb-4">
          <h2 className="text-sm font-semibold text-white">Agency Profile</h2>
          <p className="mt-0.5 text-xs text-[#666]">
            Shown on your account and used to identify your agency.
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
          <p className="rounded-xl bg-sunset/10 border border-sunset/20 px-4 py-3 text-xs text-[#f18a77]">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-xl bg-savannah/10 border border-savannah/20 px-4 py-3 text-xs text-savannah">
            Settings saved successfully.
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-gold px-6 py-2.5 text-xs font-semibold text-black disabled:opacity-40 transition hover:opacity-90"
          >
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
