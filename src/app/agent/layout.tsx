import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AgentShell } from "@/layouts/AgentShell";
import { AgentOnboardingForm } from "@/features/agent/onboarding/AgentOnboardingForm";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { createClient } from "@/lib/supabase/server";
import { getNotificationSummary } from "@/features/team/notifications/notification-service";

export default async function AgentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const agent = await requireAgentContext();
  if (!agent) redirect("/auth/continue");
  if (!agent.membership.organizationId) redirect("/auth/continue");

  // Check if the agent has completed their profile onboarding.
  const supabase = await createClient();
  const [{ data: profile }, notificationSummary] = await Promise.all([
    supabase
      .from("profiles")
      .select("agency_name")
      .eq("id", agent.context.userId)
      .maybeSingle(),
    getNotificationSummary(
      agent.membership.organizationId,
      agent.context.userId,
    ),
  ]);

  // No agency_name → first-time setup. Render the onboarding form full-page
  // instead of the portal shell. Once the form saves, router.refresh() will
  // re-render this layout and see the completed profile.
  if (!profile?.agency_name) {
    return <AgentOnboardingForm name={agent.context.firstName} />;
  }

  return (
    <AgentShell
      organizationId={agent.membership.organizationId}
      notifications={notificationSummary}
      user={{
        id: agent.context.userId,
        name: agent.context.fullName,
        agency: profile.agency_name,
        initials: agent.context.initials,
      }}
    >
      {children}
    </AgentShell>
  );
}
