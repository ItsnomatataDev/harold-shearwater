import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { HandoverInbox } from "@/features/team/harold/components/HandoverInbox";
import { getHandoverQueue } from "@/features/team/harold/handover-service";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";

export const metadata: Metadata = { title: "Harold Handover Inbox" };

export default async function HandoverInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ handover?: string }>;
}) {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");
  const organizationId = team.membership.organizationId;
  const { handover } = await searchParams;

  const conversations = await getHandoverQueue(
    organizationId,
    team.membership.id,
  );

  return (
    <section className="space-y-6">
      <HaroldModuleContext
        moduleId="handovers"
        summary={`Handover inbox (${conversations.length} conversations)`}
      />
      <ModuleHeader
        eyebrow="Team Access · Human handover"
        title="Harold Handover Inbox"
        description="When Harold hands over a conversation, the key account assistant is notified first. Qualified team members can also claim from the queue."
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
        initialHandoverId={handover ?? null}
      />
    </section>
  );
}
