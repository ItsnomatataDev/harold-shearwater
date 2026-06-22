import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { getAnnouncements } from "@/features/team/communication/communication-service";
import { CommunicationBoard } from "@/features/team/communication/components/CommunicationBoard";

export const metadata: Metadata = { title: "Communication" };

export default async function CommunicationPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) redirect("/auth/continue");
  const organizationId = team.membership.organizationId;
  const canManage = await hasOrganizationPermission(organizationId, "announcements.manage");
  const announcements = await getAnnouncements(organizationId);
  return <section className="space-y-6"><ModuleHeader title="Communication" description="Read company notices and publish time-bound operational announcements from one trusted notice board."/><CommunicationBoard announcements={announcements} organizationId={organizationId} canManage={canManage}/></section>;
}
