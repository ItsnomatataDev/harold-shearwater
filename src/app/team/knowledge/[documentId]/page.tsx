import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";
import { getDocument } from "@/features/team/knowledge/knowledge-service";
import { DocumentEditor } from "@/features/team/knowledge/components/DocumentEditor";

export default async function DocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const team = await requireTeamContext(); if (!team?.membership.organizationId) redirect("/auth/continue");
  const canManage = await hasOrganizationPermission(team.membership.organizationId, "documents.manage");
  const { documentId } = await params; const document = await getDocument(team.membership.organizationId, documentId, canManage); if (!document) notFound();
  return <article className="mx-auto max-w-4xl space-y-6"><Link href="/team/knowledge" className="text-xs font-semibold text-victoria">← Knowledge Base</Link><header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-7"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-victoria/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-victoria">{document.category}</span><span className="rounded-full bg-[#333] px-2.5 py-1 text-[9px] uppercase text-[#aaa]">{document.status}</span></div><h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">{document.title}</h1>{document.description && <p className="mt-3 text-sm leading-6 text-[#999]">{document.description}</p>}<p className="mt-5 text-xs text-[#6f6f69]">By {document.createdByName}</p></header>{canManage && <DocumentEditor document={document} organizationId={team.membership.organizationId}/>}<div className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-7"><div className="whitespace-pre-wrap text-sm leading-7 text-[#d0d0c9]">{document.content}</div></div></article>;
}
