import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { AgentInboxPage } from "@/features/agent/inbox/AgentInboxPage";
import { getInbox } from "@/features/agent/inbox/inbox-service";

export const metadata: Metadata = { title: "Inbox" };

export default async function AgentInboxRoute() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const threads = await getInbox(agent.membership.id);

  return <AgentInboxPage initialThreads={threads} />;
}
