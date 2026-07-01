import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRatesView } from "@/features/products/access";
import { getRatePlans } from "@/features/products/rate-plans-service";
import TeamRatePlansPage from "@/features/products/components/TeamRatePlansPage";

export const metadata: Metadata = { title: "Agency Rates | Admin" };

export default async function Page() {
  const team = await requireRatesView();
  if (!team) redirect("/access-pending");

  const plans = await getRatePlans(team.membership.organizationId!);

  return <TeamRatePlansPage plans={plans} basePath="/admin/products/rates" />;
}
