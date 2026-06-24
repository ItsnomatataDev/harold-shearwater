import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { ChatPage } from "@/features/chat/ChatPage";
import { getChatConversations } from "@/features/chat/chat-service";
import { getDocumentRecipients } from "@/features/documents/document-inbox-service";

export const metadata = { title: "Chat" };

export default async function AgentChatPage() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");
  const [conversations, recipients] = await Promise.all([
    getChatConversations(agent.context.userId),
    getDocumentRecipients(agent.membership.organizationId),
  ]);
  return <ChatPage initialConversations={conversations} currentUserId={agent.context.userId} accessType="agent" recipients={recipients.filter((recipient) => recipient.userId !== agent.context.userId && recipient.accessType !== "customer")} />;
}
