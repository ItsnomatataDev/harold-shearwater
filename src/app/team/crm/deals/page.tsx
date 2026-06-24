import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getCrmDeals } from "@/features/crm/deals-service";
import { getCrmContacts } from "@/features/crm/contacts-service";
import { DealsPage } from "@/features/crm/components/DealsPage";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";

export const metadata: Metadata = { title: "CRM — Deals" };

export default async function CrmDealsPage() {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");

  const orgId = team.membership.organizationId;

  const [deals, contacts] = await Promise.all([
    getCrmDeals(orgId),
    getCrmContacts(orgId),
  ]);

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="CRM"
        title="Deal Pipeline"
        description="Track every enquiry from first contact through to confirmed booking."
      />
      <DealsPage
        organizationId={orgId}
        initialDeals={deals}
        contacts={contacts}
      />
    </section>
  );
}
