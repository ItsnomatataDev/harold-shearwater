import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { DocumentInboxPage } from "@/features/documents/DocumentInboxPage";
import { getDocumentInbox } from "@/features/documents/document-inbox-service";

export const metadata = { title: "Document Inbox" };

export default async function CustomerDocumentInboxPage() {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");
  return <DocumentInboxPage documents={await getDocumentInbox(customer.context.userId)} />;
}
