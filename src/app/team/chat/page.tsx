import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { ChatPage } from "@/features/chat/ChatPage";
import { getChatConversations } from "@/features/chat/chat-service";
import { getDocumentRecipients } from "@/features/documents/document-inbox-service";

export const metadata = { title: "Chat" };

export default async function TeamChatPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");
  const { conversation } = await searchParams;
  const [conversations, recipients] = await Promise.all([getChatConversations(team.context.userId), getDocumentRecipients(team.membership.organizationId)]);
  return <ChatPage key={conversations.map((item) => item.id).join(":")} initialConversations={conversations} initialSelectedId={conversation} currentUserId={team.context.userId} accessType="team" recipients={recipients.filter((recipient) => recipient.userId !== team.context.userId)} />;
}
