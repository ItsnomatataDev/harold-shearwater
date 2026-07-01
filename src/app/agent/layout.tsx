import type { ReactNode } from "react";
import { AgentShell } from "@/layouts/AgentShell";
import { AgentOnboardingForm } from "@/features/agent/onboarding/AgentOnboardingForm";
import { redirectIfMissingPortal, getAvailablePortals } from "@/features/auth/services/auth-routing";

export default async function AgentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { context: agent, membership } = await redirectIfMissingPortal("agent");
  const showWorkspaceSwitch = (await getAvailablePortals(agent)).length > 1;

  if (!agent.agencyName) {
    return <AgentOnboardingForm name={agent.firstName} />;
  }

  return (
    <AgentShell
      showWorkspaceSwitch={showWorkspaceSwitch}
      organizationId={membership.organizationId!}
      user={{
        id: agent.userId,
        name: agent.fullName,
        agency: agent.agencyName,
        initials: agent.initials,
      }}
    >
      {children}
    </AgentShell>
  );
}
