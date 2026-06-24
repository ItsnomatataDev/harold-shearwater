import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import {
  getHaroldConversations,
} from "@/features/team/harold/harold-service";
import { isHaroldWebhookConfigured } from "@/features/team/harold/harold-webhook";
import { AgentHaroldChat } from "@/features/agent/harold/AgentHaroldChat";

export const metadata: Metadata = { title: "Harold — Agent" };

export default async function AgentHaroldPage() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const orgId = agent.membership.organizationId;
  const { conversations } = await getHaroldConversations(orgId);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#c084fc]">
          Agent Portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Harold
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Ask about products, availability, rates and policies.
        </p>
      </header>
      <AgentHaroldChat
        organizationId={orgId}
        initialConversations={conversations}
        webhookConfigured={isHaroldWebhookConfigured()}
      />
    </div>
  );
}
