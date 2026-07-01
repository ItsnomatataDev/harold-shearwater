import { redirect } from "next/navigation";
import { requireRatesView } from "@/features/products/access";
import {
  getAgentRateAccounts,
  getRatePlanWithItems,
} from "@/features/products/rate-plans-service";
import { getProducts } from "@/features/products/products-service";
import TeamRatePlanDetailPage from "@/features/products/components/TeamRatePlanDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const team = await requireRatesView();
  if (!team) redirect("/access-pending");

  const { planId } = await params;
  const organizationId = team.membership.organizationId!;
  const [plan, products, rateAccounts] = await Promise.all([
    getRatePlanWithItems(organizationId, planId),
    getProducts(organizationId, "active"),
    getAgentRateAccounts(organizationId, planId),
  ]);

  if (!plan) redirect("/admin/products/rates");

  return (
    <TeamRatePlanDetailPage
      plan={plan}
      products={products}
      agents={rateAccounts.agents}
      assignments={rateAccounts.assignments}
      basePath="/admin/products/rates"
    />
  );
}
