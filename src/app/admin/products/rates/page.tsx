import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";
import { getRatePlans } from "@/features/products/rate-plans-service";
import TeamRatePlansPage from "@/features/products/components/TeamRatePlansPage";

export const metadata = { title: "Rate Plans | Admin" };

export default async function Page() {
  const admin = await requireTeamAdminContext();
  if (!admin?.membership.organizationId) redirect("/team/dashboard");

  const plans = await getRatePlans(admin.membership.organizationId);

  return <TeamRatePlansPage plans={plans} />;
}
