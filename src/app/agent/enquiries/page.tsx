import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { getAgentEnquiries } from "@/features/agent/enquiries/enquiries-service";
import { AgentEnquiriesPage } from "@/features/agent/enquiries/AgentEnquiriesPage";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";

export const metadata: Metadata = { title: "Enquiries — Agent" };

export default async function AgentEnquiriesRoute() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const orgId = agent.membership.organizationId;
  const enquiries = await getAgentEnquiries(orgId, agent.membership.id);

  return (
    <div className="space-y-6">
      <HaroldModuleContext
        moduleId="enquiries"
        summary={`Viewing ${enquiries.length} agent enquiries`}
      />
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Agent Portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Enquiries
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Track your client pipeline from enquiry through to confirmed booking.
        </p>
      </header>
      <AgentEnquiriesPage organizationId={orgId} initialEnquiries={enquiries} />
    </div>
  );
}
