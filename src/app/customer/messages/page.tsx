import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { ChatPage } from "@/features/chat/ChatPage";
import { getChatConversations } from "@/features/chat/chat-service";
import { CustomerPageHeader } from "@/features/customer/components/CustomerPortalCards";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";

export const metadata = { title: "Messages" };

export default async function CustomerMessagesPage() {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");

  return (
    <div className="space-y-6">
      <HaroldModuleContext moduleId="messages" />
      <CustomerPageHeader
        eyebrow="Messages"
        title="Chat with Shearwater"
        description="This is your human conversation space. When Harold hands over to a team member, the live chat continues here."
      />
      <ChatPage
        initialConversations={await getChatConversations(customer.context.userId)}
        currentUserId={customer.context.userId}
        accessType="customer"
      />
    </div>
  );
}
