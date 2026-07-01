import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { AgentGoldenDuskBookingsPage } from "@/features/agent/golden-dusk/AgentGoldenDuskBookingsPage";
import { AgentBookingsRefreshButton } from "@/features/agent/golden-dusk/AgentBookingsRefreshButton";
import { loadAgentGoldenDuskBookings } from "@/features/agent/golden-dusk/golden-dusk-booking-actions";
import { getGoldenDuskConnectionSummary } from "@/features/integrations/golden-dusk/agent-auth-service";

export const metadata = { title: "GoldenDusk bookings" };

export default async function AgentBookingsRoute() {
  const ctx = await requireAgentContext();
  if (!ctx) redirect("/auth");

  const organizationId = ctx.membership.organizationId;
  if (!organizationId) redirect("/select-access");

  const connection = await getGoldenDuskConnectionSummary(ctx.membership.id);
  const result = connection.connected
    ? await loadAgentGoldenDuskBookings(organizationId)
    : null;

  return (
    <div className="shell-content space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">
            SWAIBMS
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            GoldenDusk bookings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#85857d]">
            Live bookings from GoldenDusk. Harold mirrors confirmed bookings into
            enquiries so the Shearwater team gets notifications and can read status
            here.
          </p>
        </div>
        {connection.connected && organizationId && (
          <AgentBookingsRefreshButton organizationId={organizationId} />
        )}
      </header>

      <AgentGoldenDuskBookingsPage
        connected={connection.connected}
        error={result && !result.ok ? result.error : null}
        bookings={result?.ok ? result.bookings : []}
      />
    </div>
  );
}
