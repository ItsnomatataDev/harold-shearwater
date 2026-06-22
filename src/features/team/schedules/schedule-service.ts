import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface ScheduleDuty {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  locationName: string;
  departmentName: string;
  supervisorName: string;
  assignedStaff: Array<{ membershipId: string; name: string; status: string }>;
  myAssignmentStatus: string | null;
  notes: Array<{ id: string; body: string; authorName: string; createdAt: string }>;
}

export interface ScheduleWorkspaceData {
  duties: ScheduleDuty[];
  locations: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  staff: Array<{ membershipId: string; name: string; email: string }>;
}

export async function getScheduleWorkspaceData(
  organizationId: string,
  membershipId: string,
  canManage: boolean,
): Promise<ScheduleWorkspaceData> {
  const supabase = await createClient();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  const to = new Date();
  to.setDate(to.getDate() + 45);

  const [scheduleResult, locationsResult, departmentsResult] = await Promise.all([
    supabase
      .from("schedules")
      .select("id,title,description,starts_at,ends_at,status,location_id,department_id,supervisor_membership_id")
      .eq("organization_id", organizationId)
      .gte("starts_at", from.toISOString())
      .lt("starts_at", to.toISOString())
      .order("starts_at"),
    supabase.from("locations").select("id,name").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabase.from("departments").select("id,name").eq("organization_id", organizationId).eq("active", true).order("name"),
  ]);

  for (const result of [scheduleResult, locationsResult, departmentsResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const scheduleRows = scheduleResult.data ?? [];
  const scheduleIds = scheduleRows.map((row) => row.id);
  const [{ data: assignments, error: assignmentError }, { data: notes, error: notesError }] = scheduleIds.length
    ? await Promise.all([
        supabase.from("schedule_assignments").select("schedule_id,membership_id,status").in("schedule_id", scheduleIds),
        supabase.from("duty_handover_notes").select("id,schedule_id,author_membership_id,body,created_at").in("schedule_id", scheduleIds).order("created_at", { ascending: false }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (assignmentError) throw new Error(assignmentError.message);
  if (notesError) throw new Error(notesError.message);

  const membershipIds = Array.from(new Set([
    ...(assignments ?? []).map((row) => row.membership_id),
    ...(notes ?? []).map((row) => row.author_membership_id),
    ...scheduleRows.map((row) => row.supervisor_membership_id).filter((id): id is string => Boolean(id)),
  ]));

  let memberRows: Array<{ id: string; user_id: string }> = [];
  if (membershipIds.length) {
    const result = await supabase.from("access_memberships").select("id,user_id").in("id", membershipIds);
    if (result.error) throw new Error(result.error.message);
    memberRows = result.data ?? [];
  }

  let allStaffRows: Array<{ id: string; user_id: string }> = [];
  if (canManage) {
    const result = await supabase.from("access_memberships").select("id,user_id").eq("organization_id", organizationId).eq("access_type", "team").eq("status", "active");
    if (result.error) throw new Error(result.error.message);
    allStaffRows = result.data ?? [];
  }

  const allMemberRows = Array.from(new Map([...memberRows, ...allStaffRows].map((row) => [row.id, row])).values());
  const userIds = Array.from(new Set(allMemberRows.map((row) => row.user_id)));
  const profileResult = userIds.length
    ? await supabase.from("profiles").select("id,first_name,last_name,email").in("id", userIds)
    : { data: [], error: null };
  if (profileResult.error) throw new Error(profileResult.error.message);

  const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
  const members = new Map(allMemberRows.map((member) => {
    const profile = profiles.get(member.user_id);
    const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || profile?.email || "Team member";
    return [member.id, { name, email: profile?.email ?? "" }];
  }));
  const locations = new Map((locationsResult.data ?? []).map((row) => [row.id, row.name]));
  const departments = new Map((departmentsResult.data ?? []).map((row) => [row.id, row.name]));

  const duties = scheduleRows
    .map((row) => {
      const dutyAssignments = (assignments ?? []).filter((item) => item.schedule_id === row.id);
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status as ScheduleDuty["status"],
        locationName: row.location_id ? locations.get(row.location_id) ?? "Unassigned" : "Unassigned",
        departmentName: row.department_id ? departments.get(row.department_id) ?? "Unassigned" : "Unassigned",
        supervisorName: row.supervisor_membership_id ? members.get(row.supervisor_membership_id)?.name ?? "Unassigned" : "Unassigned",
        assignedStaff: dutyAssignments.map((item) => ({ membershipId: item.membership_id, name: members.get(item.membership_id)?.name ?? "Team member", status: item.status })),
        myAssignmentStatus: dutyAssignments.find((item) => item.membership_id === membershipId)?.status ?? null,
        notes: (notes ?? []).filter((note) => note.schedule_id === row.id).map((note) => ({ id: note.id, body: note.body, authorName: members.get(note.author_membership_id)?.name ?? "Team member", createdAt: note.created_at })),
      } satisfies ScheduleDuty;
    })
    .filter((duty) => canManage || duty.myAssignmentStatus !== null);

  return {
    duties,
    locations: locationsResult.data ?? [],
    departments: departmentsResult.data ?? [],
    staff: allStaffRows.map((member) => ({ membershipId: member.id, name: members.get(member.id)?.name ?? "Team member", email: members.get(member.id)?.email ?? "" })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}
