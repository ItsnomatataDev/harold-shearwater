import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamModulePage } from "@/features/team/components/TeamModulePage";
import { requireTeamContext } from "@/features/auth/services/auth-context";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  return (
    <TeamModulePage
      eyebrow="Team Access"
      title="Knowledge"
      description="Publish policies, SOPs, and operational guidance as the approved source for people and AI assistance."
      nextSteps={[
        "Create document library with ownership and review dates.",
        "Add versioning and approval workflow before publishing.",
        "Tag documents for role-aware and location-aware visibility.",
      ]}
    />
  );
}
