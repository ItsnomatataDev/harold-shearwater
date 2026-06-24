import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getCrmContacts } from "@/features/crm/contacts-service";
import { ContactsPage } from "@/features/crm/components/ContactsPage";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";

export const metadata: Metadata = { title: "CRM — Contacts" };

export default async function CrmPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");
  if (!team.membership.organizationId) redirect("/auth/continue");

  const contacts = await getCrmContacts(team.membership.organizationId);

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="CRM"
        title="Contacts"
        description="Manage leads, guests, agents and key relationships for your organisation."
      />
      <ContactsPage
        organizationId={team.membership.organizationId}
        initialContacts={contacts}
      />
    </section>
  );
}
