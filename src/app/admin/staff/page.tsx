import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  hasOrganizationPermission,
  hasTeamAdminAccess,
  requireAdminPortalContext,
} from "@/features/auth/services/auth-context";
import { getCrewData } from "@/features/team/crew/crew-service";
import { InviteMemberForm } from "@/features/team/crew/components/InviteMemberForm";
import { MembersList } from "@/features/team/crew/components/MembersList";

export const metadata: Metadata = { title: "Admin Staff Management" };

export default async function AdminStaffPage() {
  const admin = await requireAdminPortalContext();
  if (!admin || !admin.membership.organizationId) redirect("/access-pending");

  const { organizationId, id: membershipId } = admin.membership;
  const { members, roles } = await getCrewData(organizationId);

  const isTeamAdmin = await hasTeamAdminAccess(membershipId);
  const [canManageMembersPermission, canManageRolesPermission] =
    await Promise.all([
      hasOrganizationPermission(organizationId, "members.manage"),
      hasOrganizationPermission(organizationId, "roles.manage"),
    ]);

  const canManageMembers = isTeamAdmin || canManageMembersPermission;
  const canManageRoles = isTeamAdmin || canManageRolesPermission;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Admin Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Staff Management
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Manage invitations, team membership lifecycle, and role assignments
          across Team Access.
        </p>
      </header>

      <InviteMemberForm
        roles={roles}
        organizationId={organizationId}
        canManageMembers={canManageMembers}
      />

      <MembersList
        members={members}
        roles={roles}
        organizationId={organizationId}
        canManageMembers={canManageMembers}
        canManageRoles={canManageRoles}
      />
    </section>
  );
}
