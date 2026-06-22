import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamModulePage } from "@/features/team/components/TeamModulePage";
import { requireTeamContext } from "@/features/auth/services/auth-context";

export const metadata: Metadata = { title: "Harold" };

export default async function HaroldPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  return (
    <TeamModulePage
      eyebrow="Team Access"
      title="Harold"
      description="Use controlled AI assistance to answer, draft, recommend, and act within approved permissions and audit boundaries."
      nextSteps={[
        "Connect Harold to approved knowledge sources only.",
        "Add confidence and escalation thresholds for human handover.",
        "Allow low-risk actions with confirmation and full audit history.",
      ]}
    />
  );
}
