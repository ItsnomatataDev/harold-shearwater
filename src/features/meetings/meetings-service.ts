import { createClient } from "@/lib/supabase/server";

export type Meeting = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  meeting_type: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduled_at: string;
  ended_at: string | null;
  location_notes: string | null;
  notes: string | null;
  notes_approved: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingAction = {
  id: string;
  meeting_id: string;
  title: string;
  assignee_id: string | null;
  due_date: string | null;
  status: "open" | "done" | "cancelled";
};

export async function getMeetings(
  organizationId: string,
  status?: "scheduled" | "in_progress" | "completed" | "cancelled",
): Promise<Meeting[]> {
  const supabase = await createClient();
  let query = supabase
    .from("meetings")
    .select("*")
    .eq("organization_id", organizationId)
    .order("scheduled_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

export async function getUpcomingMeetings(
  organizationId: string,
  limit = 5,
): Promise<Meeting[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

export async function getMeetingActions(
  organizationId: string,
  membershipId?: string,
): Promise<MeetingAction[]> {
  const supabase = await createClient();
  let query = supabase
    .from("meeting_actions")
    .select("*, meeting:meetings!inner(organization_id)")
    .eq("meetings.organization_id", organizationId)
    .eq("status", "open");

  if (membershipId) query = query.eq("assignee_id", membershipId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MeetingAction[];
}
