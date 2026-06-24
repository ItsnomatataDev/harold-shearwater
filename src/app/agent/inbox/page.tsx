import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { DocumentInboxPage } from "@/features/documents/DocumentInboxPage";
import { getDocumentInbox } from "@/features/documents/document-inbox-service";

export const metadata: Metadata = { title: "Inbox" };

export default async function AgentInboxRoute() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const documents = await getDocumentInbox(agent.context.userId);

  return <DocumentInboxPage documents={documents} />;
}
