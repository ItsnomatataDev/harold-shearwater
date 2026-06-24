"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import type { Product } from "@/features/products/products-service";
import { searchLiveAvailability } from "./booking-actions";
import type { AvailabilitySlot } from "./booking-provider";

export function AgentAvailabilitySearch({
  organizationId,
  products,
  providerConfigured,
}: {
  organizationId: string;
  products: Product[];
  providerConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">Agent Portal</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Search availability</h1>
        <p className="mt-1 text-sm text-[#666]">The search experience is ready for the live booking provider.</p>
      </header>

      {!providerConfigured ? (
        <div className="flex gap-3 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-xs leading-5 text-[#c6a85d]">
          <Icon name="alertCircle" className="mt-0.5 h-4 w-4 shrink-0" />
          Product information and contracted rates are live. Capacity, time slots, holds and confirmations will activate when the booking provider is connected.
        </div>
      ) : null}

      <form
        className="grid gap-3 rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-5 md:grid-cols-[minmax(0,1fr)_180px_120px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            try {
              setSlots(await searchLiveAvailability(organizationId, {
                productId: data.get("productId"),
                date: data.get("date"),
                partySize: data.get("partySize"),
              }));
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Unable to search availability.");
            }
          });
        }}
      >
        <select name="productId" required className="input">
          <option value="">Select an experience</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <input name="date" type="date" required className="input" />
        <input name="partySize" type="number" min="1" defaultValue="2" required className="input" aria-label="Party size" />
        <button disabled={pending} className="rounded-xl bg-gold px-5 py-2.5 text-xs font-semibold text-black disabled:opacity-40">{pending ? "Searching…" : "Search"}</button>
      </form>

      {error ? <p className="rounded-xl bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">{error}</p> : null}
      {slots.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => (
            <div key={slot.externalId} className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-5">
              <p className="text-sm font-semibold text-white">{new Date(slot.startsAt).toLocaleString("en-GB")}</p>
              <p className="mt-2 text-xs text-[#777]">{slot.remainingCapacity ?? "—"} spaces remaining</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
