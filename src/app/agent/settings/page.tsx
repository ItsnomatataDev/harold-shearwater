import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { AgentSettingsForm } from "@/features/agent/settings/AgentSettingsForm";
import { GoldenDuskConnectPanel } from "@/features/agent/golden-dusk/GoldenDuskConnectPanel";
import { getAgentSettingsPageData } from "@/features/agent/profile/agent-display-profile";

export const metadata: Metadata = { title: "Settings — Agent" };

export default async function AgentSettingsPage() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const { goldenDusk, connection, defaults } = await getAgentSettingsPageData(
    agent.context,
    agent.membership.id,
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Agent Portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Agency Settings
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Your booking identity comes from SWAIBMS. You can add portal contact
          details here for Shearwater.
        </p>
      </header>
      <AgentSettingsForm
        userId={agent.context.userId}
        defaults={defaults}
        goldenDusk={goldenDusk}
      />
      <GoldenDuskConnectPanel connection={connection} />
    </div>
  );
}
