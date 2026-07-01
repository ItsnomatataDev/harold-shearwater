import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { getAgentRatePlans } from "@/features/products/rate-plans-service";
import AgentRatesPage from "@/features/products/components/AgentRatesPage";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";

export const metadata = { title: "Rates — Agent" };

export default async function AgentRatesRoute() {
  const ctx = await requireAgentContext();
  if (!ctx) redirect("/auth");
  if (!ctx.membership.organizationId) redirect("/auth/continue");

  const ratePlans = await getAgentRatePlans(ctx.membership.id);
  const agencyName = ctx.context.agencyName ?? "Your agency";
  const totalPrices = ratePlans.reduce((sum, plan) => sum + plan.items.length, 0);

  return (
    <>
      <HaroldModuleContext
        moduleId="rates"
        summary={`Viewing ${ratePlans.length} rate plan(s) with ${totalPrices} contracted price(s) for ${agencyName}`}
      />
      <AgentRatesPage ratePlans={ratePlans} agencyName={agencyName} />
    </>
  );
}
