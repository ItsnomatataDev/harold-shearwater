import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  hasOrganizationPermission,
  requireTeamContext,
} from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { getAnnouncements } from "@/features/team/communication/communication-service";
import { CommunicationBoard } from "@/features/team/communication/components/CommunicationBoard";
import { canAccessHandoverInbox } from "@/features/team/harold/handover-routing";

export const metadata: Metadata = { title: "Communication" };

export default async function CommunicationPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) redirect("/auth/continue");
  const organizationId = team.membership.organizationId;
  const [canManage, canManageHandovers, announcements] = await Promise.all([
    hasOrganizationPermission(organizationId, "announcements.manage"),
    canAccessHandoverInbox(organizationId, (permission) =>
      hasOrganizationPermission(organizationId, permission),
    ),
    getAnnouncements(organizationId),
  ]);

  return (
    <section className="space-y-6">
      <ModuleHeader
        title="Communication"
        description="Read company notices and manage AI conversations handed over to qualified Team Access specialists."
        action={
          canManageHandovers ? (
            <Link
              href="/team/communication/handovers"
              className="flex items-center gap-2 rounded-xl bg-savannah px-4 py-2.5 text-xs font-semibold text-[#102018]"
            >
              <span className="h-2 w-2 rounded-full bg-[#102018]" />
              Open handover inbox
            </Link>
          ) : undefined
        }
      />
      <CommunicationBoard
        announcements={announcements}
        organizationId={organizationId}
        canManage={canManage}
      />
    </section>
  );
}
