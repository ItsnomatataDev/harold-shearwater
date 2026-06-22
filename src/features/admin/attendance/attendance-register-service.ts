import "server-only";

import { createClient } from "@/lib/supabase/server";

export type AttendanceStatusFilter =
  | "all"
  | "present"
  | "clocked-out"
  | "absent";

export interface AdminAttendanceRow {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  jobTitle: string;
  employeeNumber: string | null;
  departmentId: string | null;
  departmentName: string;
  locationId: string | null;
  locationName: string;
  firstClockInAt: string | null;
  lastClockOutAt: string | null;
  workedMinutes: number;
  status: "present" | "clocked-out" | "absent";
}

export interface AdminAttendanceRegisterData {
  rows: AdminAttendanceRow[];
  departments: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
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

function calculateWorkedMinutes(
  entries: Array<{ clocked_in_at: string; clocked_out_at: string | null }>,
) {
  const now = Date.now();

  return entries.reduce((total, entry) => {
    const start = new Date(entry.clocked_in_at).getTime();
    const end = entry.clocked_out_at
      ? new Date(entry.clocked_out_at).getTime()
      : now;

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      return total;
    }

    return total + Math.floor((end - start) / 60000);
  }, 0);
}

export async function getAdminAttendanceRegisterData(
  organizationId: string,
): Promise<AdminAttendanceRegisterData> {
  const supabase = await createClient();
  const today = harareDayBounds();

  const [membershipsResult, departmentsResult, locationsResult, entriesResult] =
    await Promise.all([
      supabase
        .from("access_memberships")
        .select(
          "id,user_id,employee_number,department_id,primary_location_id,status",
        )
        .eq("organization_id", organizationId)
        .eq("access_type", "team")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("departments")
        .select("id,name")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("locations")
        .select("id,name")
        .eq("organization_id", organizationId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("attendance_entries")
        .select("membership_id,clocked_in_at,clocked_out_at")
        .eq("organization_id", organizationId)
        .gte("clocked_in_at", today.start)
        .lt("clocked_in_at", today.end)
        .order("clocked_in_at", { ascending: true }),
    ]);

  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  if (departmentsResult.error) throw new Error(departmentsResult.error.message);
  if (locationsResult.error) throw new Error(locationsResult.error.message);
  if (entriesResult.error) throw new Error(entriesResult.error.message);

  const memberships = membershipsResult.data ?? [];
  const userIds = Array.from(
    new Set(memberships.map((item) => item.user_id).filter(Boolean)),
  );

  const { data: profilesData, error: profilesError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id,email,first_name,last_name,job_title")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) throw new Error(profilesError.message);

  const profilesById = new Map(
    (profilesData ?? []).map((profile) => [profile.id, profile]),
  );
  const departmentsById = new Map(
    (departmentsResult.data ?? []).map((department) => [
      department.id,
      department.name,
    ]),
  );
  const locationsById = new Map(
    (locationsResult.data ?? []).map((location) => [
      location.id,
      location.name,
    ]),
  );

  const entriesByMembership = new Map<
    string,
    Array<{ clocked_in_at: string; clocked_out_at: string | null }>
  >();

  for (const entry of entriesResult.data ?? []) {
    const bucket = entriesByMembership.get(entry.membership_id) ?? [];
    bucket.push({
      clocked_in_at: entry.clocked_in_at,
      clocked_out_at: entry.clocked_out_at,
    });
    entriesByMembership.set(entry.membership_id, bucket);
  }

  const rows: AdminAttendanceRow[] = memberships.map((member) => {
    const profile = profilesById.get(member.user_id);
    const firstName = profile?.first_name?.trim() ?? "";
    const lastName = profile?.last_name?.trim() ?? "";
    const fullName =
      `${firstName} ${lastName}`.trim() || profile?.email || "Unknown";

    const entries = entriesByMembership.get(member.id) ?? [];
    const firstClockInAt = entries.length ? entries[0].clocked_in_at : null;
    const lastClockOutAt = entries.length
      ? ([...entries].reverse().find((entry) => entry.clocked_out_at)
          ?.clocked_out_at ?? null)
      : null;

    const hasOpenEntry = entries.some((entry) => !entry.clocked_out_at);
    const status: AdminAttendanceRow["status"] = entries.length
      ? hasOpenEntry
        ? "present"
        : "clocked-out"
      : "absent";

    return {
      membershipId: member.id,
      userId: member.user_id,
      fullName,
      email: profile?.email ?? "",
      jobTitle: profile?.job_title ?? "Team Member",
      employeeNumber: member.employee_number,
      departmentId: member.department_id,
      departmentName: member.department_id
        ? (departmentsById.get(member.department_id) ?? "Unassigned")
        : "Unassigned",
      locationId: member.primary_location_id,
      locationName: member.primary_location_id
        ? (locationsById.get(member.primary_location_id) ?? "Unassigned")
        : "Unassigned",
      firstClockInAt,
      lastClockOutAt,
      workedMinutes: calculateWorkedMinutes(entries),
      status,
    };
  });

  return {
    rows,
    departments: (departmentsResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
    })),
    locations: (locationsResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
    })),
  };
}
