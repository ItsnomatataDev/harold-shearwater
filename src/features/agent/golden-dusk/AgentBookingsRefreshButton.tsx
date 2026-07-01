"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { refreshAgentGoldenDuskBookings } from "@/features/agent/golden-dusk/golden-dusk-booking-actions";

export function AgentBookingsRefreshButton({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setMessage(null);
            const result = await refreshAgentGoldenDuskBookings(organizationId);
            if (result.ok) {
              setMessage("Bookings refreshed from SWAIBMS.");
              router.refresh();
              return;
            }
            setError(result.error);
          })
        }
        className="rounded-lg border border-[#343431] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#aaa] transition hover:border-gold/40 hover:text-gold disabled:opacity-50"
      >
        {pending ? "Refreshing…" : "Refresh from SWAIBMS"}
      </button>
      {message && (
        <p className="text-xs text-savannah">{message}</p>
      )}
      {error && (
        <p className="text-xs text-[#f18a77]">{error}</p>
      )}
    </div>
  );
}
