import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamModulePage } from "@/features/team/components/TeamModulePage";
import { requireTeamContext } from "@/features/auth/services/auth-context";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  return (
    <TeamModulePage
      eyebrow="Team Access"
      title="Insights"
      description="Measure operations, attendance, service levels, and booking outcomes using trusted data from the shared platform."
      nextSteps={[
        "Define operational KPIs and ownership for each metric.",
        "Build role-aware dashboards with drill-down to source records.",
        "Schedule weekly exception reports for team leads and managers.",
      ]}
    />
  );
}
