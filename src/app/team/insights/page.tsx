import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { getReportsData } from "@/features/team/reports/reports-service";
import { ReportsView } from "@/features/team/reports/components/ReportsView";

export const metadata: Metadata = { title: "Reports" };

export default async function InsightsPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) redirect("/auth/continue");
  const organizationId = team.membership.organizationId;
  const [canManageAttendance, canManageSchedules] = await Promise.all([hasOrganizationPermission(organizationId, "attendance.manage"), hasOrganizationPermission(organizationId, "schedules.manage")]);
  const data = await getReportsData(organizationId, team.membership.id, canManageAttendance, canManageSchedules);
  return <section className="space-y-6"><ModuleHeader title="Reports" description="A live operational summary calculated from attendance, duties, meetings, announcements, and published knowledge."/><ReportsView data={data}/></section>;
}
