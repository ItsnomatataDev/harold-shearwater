import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { DocumentInboxPage } from "@/features/documents/DocumentInboxPage";
import { getDocumentInbox, getDocumentRecipients } from "@/features/documents/document-inbox-service";

export const metadata = { title: "Document Inbox" };

export default async function TeamDocumentInboxPage() {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");
  const [documents, recipients] = await Promise.all([
    getDocumentInbox(team.context.userId),
    getDocumentRecipients(team.membership.organizationId),
  ]);
  return <DocumentInboxPage documents={documents} recipients={recipients} />;
}
