import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { AgentSettingsForm } from "@/features/agent/settings/AgentSettingsForm";

export const metadata: Metadata = { title: "Settings — Agent" };

export default async function AgentSettingsPage() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

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
          Manage your agency profile and account details.
        </p>
      </header>
      <AgentSettingsForm
        userId={agent.context.userId}
        defaults={{
          firstName: agent.context.firstName,
          lastName: agent.context.lastName,
          phone: agent.context.phone,
          agencyName: agent.context.agencyName ?? "",
          website: agent.context.website ?? "",
        }}
      />
    </div>
  );
}
