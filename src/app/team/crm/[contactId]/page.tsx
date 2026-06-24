import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import {
  getCrmContact,
  getCrmActivities,
  getCrmContacts,
} from "@/features/crm/contacts-service";
import { getCrmDealsByContact } from "@/features/crm/deals-service";
import { ContactDetailPage } from "@/features/crm/components/ContactDetailPage";

export const metadata: Metadata = { title: "Contact — CRM" };

export default async function ContactPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");

  const { contactId } = await params;
  const orgId = team.membership.organizationId;

  const [contact, activities, deals, contacts] = await Promise.all([
    getCrmContact(orgId, contactId),
    getCrmActivities(orgId, contactId),
    getCrmDealsByContact(orgId, contactId),
    getCrmContacts(orgId),
  ]);

  if (!contact) notFound();

  return (
    <ContactDetailPage
      organizationId={orgId}
      contact={contact}
      activities={activities}
      deals={deals}
      contacts={contacts}
    />
  );
}
