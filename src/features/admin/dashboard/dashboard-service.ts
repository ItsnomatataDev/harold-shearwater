import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AdminDashboardMetrics {
  totalActiveStaff: number;
  presentToday: number;
  absentToday: number;
  pendingInvitations: number;
  suspendedAccounts: number;
  recentAuditActivity: number;
}

export interface RecentAuditItem {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics;
  recentAudits: RecentAuditItem[];
}

function harareDayBounds() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Harare",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const date = `${read("year")}-${read("month")}-${read("day")}`;

  const start = new Date(`${date}T00:00:00+02:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getAdminDashboardData(
  organizationId: string,
): Promise<AdminDashboardData> {
  const supabase = await createClient();
  const today = harareDayBounds();

  const [
    activeStaffResult,
    suspendedResult,
    invitationsResult,
    attendanceTodayResult,
    recentAuditCountResult,
    recentAuditsResult,
  ] = await Promise.all([
    supabase
      .from("access_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("access_type", "team")
      .eq("status", "active"),
    supabase
      .from("access_memberships")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("access_type", "team")
      .eq("status", "suspended"),
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("access_type", "team")
      .is("accepted_at", null),
    supabase
      .from("attendance_entries")
      .select("membership_id")
      .eq("organization_id", organizationId)
      .gte("clocked_in_at", today.start)
      .lt("clocked_in_at", today.end),
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      ),
    supabase
      .from("audit_logs")
      .select("id,action,entity_type,entity_id,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  for (const result of [
    activeStaffResult,
    suspendedResult,
    invitationsResult,
    attendanceTodayResult,
    recentAuditCountResult,
    recentAuditsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const totalActiveStaff = activeStaffResult.count ?? 0;
  const presentToday = new Set(
    (attendanceTodayResult.data ?? []).map((row) => row.membership_id),
  ).size;
  const absentToday = Math.max(totalActiveStaff - presentToday, 0);

  return {
    metrics: {
      totalActiveStaff,
      presentToday,
      absentToday,
      pendingInvitations: invitationsResult.count ?? 0,
      suspendedAccounts: suspendedResult.count ?? 0,
      recentAuditActivity: recentAuditCountResult.count ?? 0,
    },
    recentAudits: (recentAuditsResult.data ?? []).map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entity_type,
      entityId: item.entity_id,
      createdAt: item.created_at,
    })),
  };
}
