import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface MeetingView {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string;
  attendees: Array<{ userId: string; name: string; email: string; response: "needs_action" | "accepted" | "declined" | "tentative" }>;
  myResponse: "needs_action" | "accepted" | "declined" | "tentative" | null;
}

export async function getMeetingsData(organizationId: string, userId: string, canManage: boolean) {
  const supabase = await createClient();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setDate(to.getDate() + 90);
  const { data: meetings, error } = await supabase.from("meetings").select("id,title,description,starts_at,ends_at,location").eq("organization_id", organizationId).gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at");
  if (error) throw new Error(error.message);
  const ids = (meetings ?? []).map((row) => row.id);
  const attendeeResult = ids.length ? await supabase.from("meeting_attendees").select("meeting_id,user_id,response").in("meeting_id", ids) : { data: [], error: null };
  if (attendeeResult.error) throw new Error(attendeeResult.error.message);
  const userIds = Array.from(new Set((attendeeResult.data ?? []).map((row) => row.user_id)));
  const profileResult = userIds.length ? await supabase.from("profiles").select("id,first_name,last_name,email").in("id", userIds) : { data: [], error: null };
  if (profileResult.error) throw new Error(profileResult.error.message);
  const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));

  let staff: Array<{ userId: string; name: string; email: string }> = [];
  if (canManage) {
    const membershipResult = await supabase.from("access_memberships").select("user_id").eq("organization_id", organizationId).eq("access_type", "team").eq("status", "active");
    if (membershipResult.error) throw new Error(membershipResult.error.message);
    const staffIds = Array.from(new Set((membershipResult.data ?? []).map((row) => row.user_id)));
    const staffProfiles = staffIds.length ? await supabase.from("profiles").select("id,first_name,last_name,email").in("id", staffIds) : { data: [], error: null };
    if (staffProfiles.error) throw new Error(staffProfiles.error.message);
    staff = (staffProfiles.data ?? []).map((profile) => ({ userId: profile.id, name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email, email: profile.email })).sort((a, b) => a.name.localeCompare(b.name));
  }

  const records: MeetingView[] = (meetings ?? []).map((meeting) => {
    const attendees = (attendeeResult.data ?? []).filter((row) => row.meeting_id === meeting.id).map((row) => {
      const profile = profiles.get(row.user_id);
      return { userId: row.user_id, name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || profile?.email || "Team member", email: profile?.email ?? "", response: row.response as MeetingView["attendees"][number]["response"] };
    });
    return { id: meeting.id, title: meeting.title, description: meeting.description, startsAt: meeting.starts_at, endsAt: meeting.ends_at, location: meeting.location ?? "To be confirmed", attendees, myResponse: attendees.find((person) => person.userId === userId)?.response ?? null };
  });
  return { meetings: records, staff };
}
