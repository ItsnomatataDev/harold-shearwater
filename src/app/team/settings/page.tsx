import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getAuditLogs, getMembershipRoleNames } from "@/features/team/settings/settings-service";
import { AuditLogViewer } from "@/features/team/settings/components/AuditLogViewer";
import { ProfileSettingsForm } from "@/features/team/settings/components/ProfileSettingsForm";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { hasOrganizationPermission } from "@/features/auth/services/auth-context";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const canViewAudit = await hasOrganizationPermission(team.membership.organizationId, "audit.view");
  const [roleNames, logs] = await Promise.all([getMembershipRoleNames(team.membership.id), canViewAudit ? getAuditLogs(team.membership.organizationId) : Promise.resolve([])]);

  return (
    <section className="space-y-6">
      <ModuleHeader eyebrow="Your account" title="Profile & Settings" description="Keep your staff profile accurate and review the organization, location, department, and role attached to your access." />
      <ProfileSettingsForm profile={{ firstName: team.context.firstName, lastName: team.context.lastName, email: team.context.email, phone: team.context.phone, jobTitle: team.context.jobTitle, timezone: team.context.timezone, avatarUrl: team.context.avatarUrl }} organization={team.membership.organizationName ?? "Shearwater Victoria Falls"} membership={{ department: team.membership.departmentName ?? "Not assigned", location: team.membership.primaryLocationName ?? "Not assigned", employeeNumber: team.membership.employeeNumber }} roleNames={roleNames}/>
      {canViewAudit && <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[.14em] text-gold">Administrator audit</p><AuditLogViewer logs={logs}/></div>}
    </section>
  );
}
