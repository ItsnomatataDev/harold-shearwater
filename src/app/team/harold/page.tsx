import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { HaroldChat } from "@/features/team/harold/components/HaroldChat";
import { getHaroldConversations } from "@/features/team/harold/harold-service";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";

export const metadata: Metadata = { title: "Harold" };

export default async function HaroldPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const conversations = await getHaroldConversations(team.membership.organizationId);
  return (
    <section className="space-y-6">
      <ModuleHeader eyebrow="Intelligent Operations" title="Harold" description="Build a real conversation history now. Governed AI answers will activate only after the AI service and knowledge controls are connected." />

      <HaroldChat organizationId={team.membership.organizationId} initialConversations={conversations} />
    </section>
  );
}
