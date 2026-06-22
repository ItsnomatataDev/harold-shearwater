import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";
import { getDocuments } from "@/features/team/knowledge/knowledge-service";
import { DocumentsList } from "@/features/team/knowledge/components/DocumentsList";
import { CreateDocumentForm } from "@/features/team/knowledge/components/CreateDocumentForm";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const canManage = await hasOrganizationPermission(team.membership.organizationId, "documents.manage");
  const documents = await getDocuments(team.membership.organizationId, canManage);

  return (
    <section className="space-y-6">
      <ModuleHeader eyebrow="Operations Knowledge" title="Knowledge Base" description="Find approved policies, SOPs, and operational guidance—the future source of truth for Harold." />

      {canManage && <CreateDocumentForm organizationId={team.membership.organizationId} />}

      <DocumentsList
        documents={documents}
        organizationId={team.membership.organizationId}
        canManage={canManage}
      />
    </section>
  );
}
