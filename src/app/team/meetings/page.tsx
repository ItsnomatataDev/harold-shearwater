import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { getMeetingsData } from "@/features/team/meetings/meeting-service";
import { MeetingsWorkspace } from "@/features/team/meetings/components/MeetingsWorkspace";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage() {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");
  const organizationId = team.membership.organizationId;
  const canManage = await hasOrganizationPermission(organizationId, "meetings.manage");
  const data = await getMeetingsData(organizationId, team.context.userId, canManage);
  return <section className="space-y-6"><ModuleHeader title="Meetings" description="Keep operational meetings, agendas, attendees, and responses in one dependable calendar."/><MeetingsWorkspace {...data} canManage={canManage} organizationId={organizationId}/></section>;
}
