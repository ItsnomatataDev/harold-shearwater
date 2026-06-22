import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TeamModulePage } from "@/features/team/components/TeamModulePage";
import { requireTeamContext } from "@/features/auth/services/auth-context";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  return (
    <TeamModulePage
      eyebrow="Team Access"
      title="Settings"
      description="Configure workspace defaults, notification rules, and platform controls with clear administrative boundaries."
      nextSteps={[
        "Split settings by organization, security, and communication preferences.",
        "Add integration health checks and credential rotation reminders.",
        "Expose audit views for high-impact configuration changes.",
      ]}
    />
  );
}
