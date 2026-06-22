import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamModulePage } from "@/features/team/components/TeamModulePage";
import { requireTeamContext } from "@/features/auth/services/auth-context";

export const metadata: Metadata = { title: "Communication" };

export default async function CommunicationPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  return (
    <TeamModulePage
      eyebrow="Team Access"
      title="Communication"
      description="Coordinate internal and external conversations with context linked to work, customers, and bookings."
      nextSteps={[
        "Implement channel-based team messaging with search.",
        "Connect conversations to customers, agents, and bookings.",
        "Enable controlled handover between Harold and human operators.",
      ]}
    />
  );
}
