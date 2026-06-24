import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { getAgentEnquiryDetail } from "@/features/agent/enquiries/enquiries-service";
import { AgentEnquiryDetailPage } from "@/features/agent/enquiries/AgentEnquiryDetailPage";

export const metadata: Metadata = { title: "Enquiry — Agent" };

export default async function AgentEnquiryRoute({
  params,
}: {
  params: Promise<{ enquiryId: string }>;
}) {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");
  const { enquiryId } = await params;
  const detail = await getAgentEnquiryDetail(
    agent.membership.organizationId,
    agent.membership.id,
    enquiryId,
  );
  if (!detail) notFound();

  return (
    <AgentEnquiryDetailPage
      organizationId={agent.membership.organizationId}
      {...detail}
    />
  );
}
