import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { ChatPage } from "@/features/chat/ChatPage";
import { getChatConversations } from "@/features/chat/chat-service";

export const metadata = { title: "Chat" };

export default async function CustomerChatPage() {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");
  return <ChatPage initialConversations={await getChatConversations(customer.context.userId)} currentUserId={customer.context.userId} accessType="customer" />;
}
