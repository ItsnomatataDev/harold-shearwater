import type { ReactNode } from "react";
import { AgentShell } from "@/layouts/AgentShell";
import { AgentOnboardingForm } from "@/features/agent/onboarding/AgentOnboardingForm";
import {
  redirectIfMissingPortal,
  getAvailablePortals,
} from "@/features/auth/services/auth-routing";
import {
  ensureAgentProfileSeededFromGoldenDusk,
  getAgentDisplayIdentity,
  getAgentGoldenDuskProfileView,
} from "@/features/agent/profile/agent-display-profile";

export default async function AgentLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { context: agent, membership } = await redirectIfMissingPortal("agent");
  const showWorkspaceSwitch = (await getAvailablePortals(agent)).length > 1;

  await ensureAgentProfileSeededFromGoldenDusk(
    agent.userId,
    membership.id,
    agent,
  );

  const goldenDusk = await getAgentGoldenDuskProfileView(membership.id);
  if (!agent.agencyName && !goldenDusk?.agencyName) {
    const display = await getAgentDisplayIdentity(agent, membership.id);
    return <AgentOnboardingForm name={display.name} goldenDusk={goldenDusk} />;
  }

  const display = await getAgentDisplayIdentity(agent, membership.id);

  return (
    <AgentShell
      showWorkspaceSwitch={showWorkspaceSwitch}
      organizationId={membership.organizationId!}
      user={{
        id: agent.userId,
        name: display.name,
        agency: display.agency,
        initials: display.initials,
      }}
    >
      {children}
    </AgentShell>
  );
}
