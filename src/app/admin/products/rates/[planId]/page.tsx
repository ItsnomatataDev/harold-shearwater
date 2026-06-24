import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";
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
  const admin = await requireTeamAdminContext();
  if (!admin?.membership.organizationId) redirect("/team/dashboard");

  const { planId } = await params;
  const [plan, products, rateAccounts] = await Promise.all([
    getRatePlanWithItems(admin.membership.organizationId, planId),
    getProducts(admin.membership.organizationId, "active"),
    getAgentRateAccounts(admin.membership.organizationId, planId),
  ]);

  if (!plan) redirect("/admin/products/rates");

  return (
    <TeamRatePlanDetailPage
      plan={plan}
      products={products}
      agents={rateAccounts.agents}
      assignments={rateAccounts.assignments}
    />
  );
}
