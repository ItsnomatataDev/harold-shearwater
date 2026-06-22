import "server-only";

import { createClient } from "@/lib/supabase/server";

function minutes(entries: Array<{ clocked_in_at: string; clocked_out_at: string | null }>) {
  return entries.reduce((sum, entry) => sum + Math.max(0, Math.floor(((entry.clocked_out_at ? new Date(entry.clocked_out_at).getTime() : Date.now()) - new Date(entry.clocked_in_at).getTime()) / 60_000)), 0);
}

export async function getReportsData(organizationId: string, membershipId: string, canManageAttendance: boolean, canManageSchedules: boolean) {
  const supabase = await createClient();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0); const tomorrow = new Date(todayStart.getTime() + 86_400_000);
  const [attendance, assignments, meetings, announcements, documents] = await Promise.all([
    supabase.from("attendance_entries").select("membership_id,clocked_in_at,clocked_out_at").eq("organization_id", organizationId).gte("clocked_in_at", monthStart.toISOString()),
    supabase.from("schedule_assignments").select("membership_id,status,schedules!inner(organization_id,starts_at)").eq("schedules.organization_id", organizationId).gte("schedules.starts_at", monthStart.toISOString()),
    supabase.from("meetings").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("starts_at", new Date().toISOString()),
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "published"),
  ]);
  for (const result of [attendance, assignments, meetings, announcements, documents]) if (result.error) throw new Error(result.error.message);
  const ownAttendance = (attendance.data ?? []).filter((entry) => entry.membership_id === membershipId);
  const ownAssignments = (assignments.data ?? []).filter((entry) => entry.membership_id === membershipId);
  const personal = { attendanceDays: new Set(ownAttendance.map((entry) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare" }).format(new Date(entry.clocked_in_at)))).size, workedMinutes: minutes(ownAttendance), dutiesCompleted: ownAssignments.filter((item) => item.status === "completed").length, dutiesAssigned: ownAssignments.length, upcomingMeetings: meetings.count ?? 0, announcements: announcements.count ?? 0, documents: documents.count ?? 0 };
  if (!canManageAttendance && !canManageSchedules) return { personal, manager: null };

  const memberships = await supabase.from("access_memberships").select("id,department_id").eq("organization_id", organizationId).eq("access_type", "team").eq("status", "active"); if (memberships.error) throw new Error(memberships.error.message);
  const departments = await supabase.from("departments").select("id,name").eq("organization_id", organizationId); if (departments.error) throw new Error(departments.error.message);
  const todayEntries = (attendance.data ?? []).filter((entry) => new Date(entry.clocked_in_at) >= todayStart && new Date(entry.clocked_in_at) < tomorrow);
  const presentIds = new Set(todayEntries.map((entry) => entry.membership_id));
  const departmentSummary = (departments.data ?? []).map((department) => { const members = (memberships.data ?? []).filter((member) => member.department_id === department.id); return { name: department.name, active: members.length, present: members.filter((member) => presentIds.has(member.id)).length, absent: members.filter((member) => !presentIds.has(member.id)).length }; });
  const allAssignments = assignments.data ?? [];
  return { personal, manager: { activeStaff: (memberships.data ?? []).length, presentToday: presentIds.size, absentToday: Math.max(0, (memberships.data ?? []).length - presentIds.size), dutiesCompleted: allAssignments.filter((item) => item.status === "completed").length, dutiesAssigned: allAssignments.length, departmentSummary } };
}
