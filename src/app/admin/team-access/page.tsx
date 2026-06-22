import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { getCrewData } from "@/features/team/crew/crew-service";
import { InviteMemberForm } from "@/features/team/crew/components/InviteMemberForm";
import { MembersList } from "@/features/team/crew/components/MembersList";

export const metadata: Metadata = { title: "Admin Portal · Team Access" };

export default async function AdminTeamAccessPage() {
  const team = await requireTeamAdminContext();
  if (!team) redirect("/access-pending");

  if (!team.membership.organizationId) {
    redirect("/access-pending");
  }

  const { members, roles } = await getCrewData(team.membership.organizationId);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Admin Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Team Access Administration
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Restricted controls for membership lifecycle, invitations, and role
          governance.
        </p>
      </header>

      <InviteMemberForm
        roles={roles}
        organizationId={team.membership.organizationId}
        canManageMembers
      />

      <MembersList
        members={members}
        roles={roles}
        organizationId={team.membership.organizationId}
        canManageMembers
      />
    </section>
  );
}
