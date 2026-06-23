import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  hasOrganizationPermission,
  requireTeamContext,
} from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { HandoverInbox } from "@/features/team/harold/components/HandoverInbox";
import { getHandoverQueue } from "@/features/team/harold/handover-service";

export const metadata: Metadata = { title: "Harold Handover Inbox" };

export default async function HandoverInboxPage() {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");
  const organizationId = team.membership.organizationId;
  if (
    !(await hasOrganizationPermission(
      organizationId,
      "harold.handovers.manage",
    ))
  ) {
    redirect("/team/communication");
  }

  const conversations = await getHandoverQueue(organizationId);
  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="Team Access · Human handover"
        title="Harold Handover Inbox"
        description="Claim conversations escalated by Harold, respond as a Shearwater team member, and resolve each handover with a complete shared history."
        action={
          <Link
            href="/team/communication"
            className="rounded-xl border border-[#444] px-4 py-2.5 text-xs font-semibold text-[#bbb]"
          >
            Back to communication
          </Link>
        }
      />
      <HandoverInbox
        organizationId={organizationId}
        currentMembershipId={team.membership.id}
        conversations={conversations}
      />
    </section>
  );
}
