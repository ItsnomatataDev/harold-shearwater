import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getCrewData } from "@/features/team/crew/crew-service";
import { MembersList } from "@/features/team/crew/components/MembersList";
import { InviteMemberForm } from "@/features/team/crew/components/InviteMemberForm";

export const metadata: Metadata = { title: "Crew" };

export default async function CrewPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const { members, roles } = await getCrewData(team.membership.organizationId);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-sunset">
          Team Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Crew
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Manage people, teams, departments, and permissions in one place. Crew
          is the operational identity layer for every internal workflow.
        </p>
      </header>

      <InviteMemberForm
        roles={roles}
        organizationId={team.membership.organizationId}
      />

      <MembersList
        members={members}
        roles={roles}
        organizationId={team.membership.organizationId}
        userOrgId={team.membership.organizationId}
      />
    </section>
  );
}
