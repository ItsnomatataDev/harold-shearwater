import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminPortalContext } from "@/features/auth/services/auth-context";
import { getAdminDashboardData } from "@/features/admin/dashboard/dashboard-service";

export const metadata: Metadata = { title: "Admin Dashboard" };

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#8c8c86]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </article>
  );
}

export default async function AdminDashboardPage() {
  const admin = await requireAdminPortalContext();
  if (!admin || !admin.membership.organizationId) redirect("/access-pending");

  const data = await getAdminDashboardData(admin.membership.organizationId);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Admin Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Platform control summary for Team Access operations.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Total Active Staff"
          value={data.metrics.totalActiveStaff}
        />
        <MetricCard label="Present Today" value={data.metrics.presentToday} />
        <MetricCard label="Absent Today" value={data.metrics.absentToday} />
        <MetricCard
          label="Pending Team Invitations"
          value={data.metrics.pendingInvitations}
        />
        <MetricCard
          label="Suspended Accounts"
          value={data.metrics.suspendedAccounts}
        />
        <MetricCard
          label="Recent Audit Activity"
          value={data.metrics.recentAuditActivity}
        />
      </section>

      <section className="rounded-2xl border border-[#343431] bg-[#1d1d1b]">
        <header className="border-b border-[#343431] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Recent audit activity
          </h2>
        </header>
        <div className="divide-y divide-[#343431]">
          {data.recentAudits.length ? (
            data.recentAudits.map((item) => (
              <article key={item.id} className="px-6 py-4">
                <p className="text-sm font-semibold text-white">
                  {item.action}
                </p>
                <p className="mt-1 text-xs text-[#8a8a84]">
                  {item.entityType}
                  {item.entityId ? ` · ${item.entityId}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-[#74746e]">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </article>
            ))
          ) : (
            <p className="px-6 py-8 text-sm text-[#8a8a84]">
              No audit activity recorded.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
