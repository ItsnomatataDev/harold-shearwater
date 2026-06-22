import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamModulePage } from "@/features/team/components/TeamModulePage";
import { requireTeamContext } from "@/features/auth/services/auth-context";

export const metadata: Metadata = { title: "Operations" };

export default async function OperationsPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  return (
    <TeamModulePage
      eyebrow="Team Access"
      title="Operations"
      description="Track tasks, meetings, attendance, and ownership with clear statuses, deadlines, and accountability."
      nextSteps={[
        "Add kanban and list views for operational tasks.",
        "Connect meeting outcomes and action items to task creation.",
        "Surface SLA exceptions and overdue work by owner.",
      ]}
    />
  );
}
