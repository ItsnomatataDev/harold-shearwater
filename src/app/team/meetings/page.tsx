import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { getMeetingsData } from "@/features/team/meetings/meeting-service";
import { MeetingsWorkspace } from "@/features/team/meetings/components/MeetingsWorkspace";

export const metadata: Metadata = { title: "Meetings" };

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ create?: string; date?: string }> }) {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");
  const organizationId = team.membership.organizationId;
  const canManage = await hasOrganizationPermission(organizationId, "meetings.manage");
  const data = await getMeetingsData(organizationId, team.context.userId, canManage);
  const params = await searchParams;
  return <section className="space-y-6"><ModuleHeader title="Meetings" description="Schedule focused operational meetings, manage attendance responses, and keep every commitment visible on the shared calendar."/><MeetingsWorkspace {...data} canManage={canManage} organizationId={organizationId} now={new Date().toISOString()} defaultCreateOpen={params.create === "1" && canManage} defaultCreateDate={params.date}/></section>;
}
