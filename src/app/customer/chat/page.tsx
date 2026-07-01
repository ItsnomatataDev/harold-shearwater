import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { CustomerHaroldChat } from "@/features/customer/harold/CustomerHaroldChat";
import { CustomerPageHeader } from "@/features/customer/components/CustomerPortalCards";
import { getOperatingOrganizationId } from "@/features/products/products-service";
import { getHaroldConversations } from "@/features/team/harold/harold-service";

export const metadata: Metadata = { title: "Harold AI" };

export default async function CustomerHaroldPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");

  const { conversation: initialConversationId } = await searchParams;

  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) {
    return (
      <CustomerPageHeader
        eyebrow="Harold AI"
        title="Harold is not available yet"
        description="The Shearwater operator organization has not been configured. Once it is set up, Harold will connect through the n8n workflow."
      />
    );
  }

  const data = await getHaroldConversations(organizationId);

  return (
    <div className="space-y-6">
      <CustomerPageHeader
        eyebrow="Harold AI"
        title="Ask Harold"
        description="Harold answers through the secure n8n AI workflow. When you need a person, Harold hands the conversation to any available Shearwater team member and you continue in Messages."
      />
      <CustomerHaroldChat
        initialConversations={data.conversations}
        initialSelectedId={initialConversationId ?? null}
        webhookConfigured={data.webhookConfigured}
      />
    </div>
  );
}
