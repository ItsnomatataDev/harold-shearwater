import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getDocuments } from "@/features/team/knowledge/knowledge-service";
import { DocumentsList } from "@/features/team/knowledge/components/DocumentsList";
import { CreateDocumentForm } from "@/features/team/knowledge/components/CreateDocumentForm";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const documents = await getDocuments(team.membership.organizationId);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Operations Knowledge
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Knowledge
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Publish policies, SOPs, and operational guidance as the approved
          source for people and AI assistance.
        </p>
      </header>

      <CreateDocumentForm organizationId={team.membership.organizationId} />

      <DocumentsList
        documents={documents}
        organizationId={team.membership.organizationId}
      />
    </section>
  );
}
