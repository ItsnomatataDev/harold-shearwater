import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getAuditLogs } from "@/features/team/settings/settings-service";
import { OrgSettings } from "@/features/team/settings/components/OrgSettings";
import { AuditLogViewer } from "@/features/team/settings/components/AuditLogViewer";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const logs = await getAuditLogs(team.membership.organizationId);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#888880]">
          Administration
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Settings
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Configure workspace defaults, notification rules, and platform
          controls with clear administrative boundaries.
        </p>
      </header>

      <OrgSettings
        orgName={team.membership.organizationName}
        orgSlug={team.membership.organizationSlug}
      />

      <AuditLogViewer logs={logs} />
    </section>
  );
}
