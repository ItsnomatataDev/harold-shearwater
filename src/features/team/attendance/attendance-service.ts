import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AttendanceEntry {
  id: string;
  clockedInAt: string;
  clockedOutAt: string | null;
  workedMinutes: number;
}

export interface AttendanceData {
  activeEntry: AttendanceEntry | null;
  recentEntries: AttendanceEntry[];
}

function workedMinutes(start: string, end: string | null) {
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.floor((to - from) / 60_000));
}

export async function getAttendanceData(
  organizationId: string,
  membershipId: string,
): Promise<AttendanceData> {
  const supabase = await createClient();

  const [
    { data: activeEntry, error: activeError },
    { data: recentEntries, error: recentError },
  ] = await Promise.all([
    supabase
      .from("attendance_entries")
      .select("id,clocked_in_at,clocked_out_at")
      .eq("organization_id", organizationId)
      .eq("membership_id", membershipId)
      .is("clocked_out_at", null)
      .maybeSingle(),
    supabase
      .from("attendance_entries")
      .select("id,clocked_in_at,clocked_out_at")
      .eq("organization_id", organizationId)
      .eq("membership_id", membershipId)
      .order("clocked_in_at", { ascending: false })
      .limit(14),
  ]);

  if (activeError) throw new Error(activeError.message);
  if (recentError) throw new Error(recentError.message);

  return {
    activeEntry: activeEntry
      ? {
          id: activeEntry.id,
          clockedInAt: activeEntry.clocked_in_at,
          clockedOutAt: activeEntry.clocked_out_at,
          workedMinutes: workedMinutes(activeEntry.clocked_in_at, activeEntry.clocked_out_at),
        }
      : null,
    recentEntries: (recentEntries ?? []).map((entry) => ({
      id: entry.id,
      clockedInAt: entry.clocked_in_at,
      clockedOutAt: entry.clocked_out_at,
      workedMinutes: workedMinutes(entry.clocked_in_at, entry.clocked_out_at),
    })),
  };
}
