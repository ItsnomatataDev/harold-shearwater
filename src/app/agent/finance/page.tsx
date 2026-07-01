import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { AgentFinancePage } from "@/features/agent/golden-dusk/AgentFinancePage";
import { getGoldenDuskConnectionSummary } from "@/features/integrations/golden-dusk/agent-auth-service";
import {
  defaultFinanceDateRange,
  getGoldenDuskAgencyFinanceOverview,
  normalizeFinanceDateRange,
} from "@/features/integrations/golden-dusk/agent-finance-service";

export const metadata = { title: "Agency finance" };

function resolveFinanceRange(searchParams: {
  from?: string;
  to?: string;
}) {
  if (searchParams.from || searchParams.to) {
    return normalizeFinanceDateRange({
      from: searchParams.from,
      to: searchParams.to,
    });
  }
  return defaultFinanceDateRange();
}

export default async function AgentFinanceRoute({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const ctx = await requireAgentContext();
  if (!ctx) redirect("/auth");

  const organizationId = ctx.membership.organizationId;
  if (!organizationId) redirect("/select-access");

  const params = await searchParams;
  const range = resolveFinanceRange(params);
  const connection = await getGoldenDuskConnectionSummary(ctx.membership.id);

  let overview = null;
  let error: string | null = null;

  if (connection.connected) {
    try {
      overview = await getGoldenDuskAgencyFinanceOverview(ctx.membership.id, range);
    } catch (cause) {
      error =
        cause instanceof Error
          ? cause.message
          : "Unable to load SWAIBMS finance right now.";
    }
  }

  return (
    <div className="shell-content space-y-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold">
          SWAIBMS
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Agency finance</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#85857d]">
          Live agency account data from GoldenDusk — credit balance, invoices,
          statement lines, payments, and refunds. This uses your existing travel
          agent session; no separate finance login.
        </p>
      </header>

      <AgentFinancePage
        organizationId={organizationId}
        connected={connection.connected}
        error={error}
        overview={overview}
        fromDate={range.from.slice(0, 10)}
        toDate={range.to.slice(0, 10)}
      />
    </div>
  );
}
