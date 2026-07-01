import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRatesView } from "@/features/products/access";
import { getRatePlans } from "@/features/products/rate-plans-service";
import TeamRatePlansPage from "@/features/products/components/TeamRatePlansPage";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";

export const metadata: Metadata = { title: "Rate Plans" };

export default async function Page() {
  const team = await requireRatesView();
  if (!team) redirect("/team/dashboard");

  const plans = await getRatePlans(team.membership.organizationId!);

  return (
    <>
      <HaroldModuleContext
        moduleId="rates"
        summary={`Team rate plans (${plans.length} plans)`}
      />
      <TeamRatePlansPage plans={plans} basePath="/team/products/rates" />
    </>
  );
}
