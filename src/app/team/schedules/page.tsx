import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { hasOrganizationPermission } from "@/features/auth/services/auth-context";
import { getScheduleWorkspaceData } from "@/features/team/schedules/schedule-service";
import { ScheduleWorkspace } from "@/features/team/schedules/components/ScheduleWorkspace";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";

export const metadata: Metadata = { title: "Duties & Schedules" };

export default async function SchedulesPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const canManage = await hasOrganizationPermission(team.membership.organizationId, "schedules.manage");
  const data = await getScheduleWorkspaceData(team.membership.organizationId, team.membership.id, canManage);

  return (
    <section className="space-y-6">
      <ModuleHeader title="Duties & Schedules" description="See your assigned duties, work from the weekly roster, complete responsibilities, and leave a clear handover." />
      <ScheduleWorkspace data={data} organizationId={team.membership.organizationId} canManage={canManage} />
    </section>
  );
}
