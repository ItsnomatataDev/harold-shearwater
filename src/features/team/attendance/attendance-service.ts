import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AttendanceEntry {
  id: string;
  clockedInAt: string;
  clockedOutAt: string | null;
}

export interface AttendanceData {
  activeEntry: AttendanceEntry | null;
  recentEntries: AttendanceEntry[];
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
        }
      : null,
    recentEntries: (recentEntries ?? []).map((entry) => ({
      id: entry.id,
      clockedInAt: entry.clocked_in_at,
      clockedOutAt: entry.clocked_out_at,
    })),
  };
}
