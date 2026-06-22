import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { HaroldChat } from "@/features/team/harold/components/HaroldChat";

export const metadata: Metadata = { title: "Harold" };

export default async function HaroldPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-victoria">
          Intelligent Operations
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Harold
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Use controlled AI assistance to answer, draft, recommend, and act
          within approved permissions and audit boundaries.
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-[#b7b7b0]">Harold can:</p>
          <ul className="text-xs text-[#8a8a84] space-y-1">
            <li>✓ Create tasks from natural language</li>
            <li>✓ Answer questions about your team and operations</li>
            <li>✓ Suggest actions based on context</li>
            <li>✓ Maintain full audit trail of all actions</li>
          </ul>
        </div>
      </header>

      <HaroldChat organizationId={team.membership.organizationId} />
    </section>
  );
}
