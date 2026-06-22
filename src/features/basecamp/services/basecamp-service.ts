import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActiveMembership, AuthContext } from "@/features/auth/services/auth-context";
import type { Announcement, Duty, Meeting, ScheduleItem } from "@/types/basecamp";

export interface BasecampData { user: AuthContext; membership: ActiveMembership; greeting: string; locationName: string; dateLabel: string; schedule: ScheduleItem[]; duties: Duty[]; meetings: Meeting[]; announcements: Announcement[]; attendance: { clockedIn: boolean; since: string | null } }

function harareDayRange() { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()); const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""; const date = `${value("year")}-${value("month")}-${value("day")}`; const start = new Date(`${date}T00:00:00+02:00`); return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() }; }
const time = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Harare", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));

export async function getBasecampData(user: AuthContext, membership: ActiveMembership): Promise<BasecampData> {
  if (!membership.organizationId) throw new Error("Team membership is missing an organization.");
  const supabase = await createClient(); const range = harareDayRange();
  const assignmentResult = await supabase.from("schedule_assignments").select("schedule_id,status").eq("membership_id", membership.id);
  if (assignmentResult.error) throw new Error(assignmentResult.error.message);
  const scheduleIds = (assignmentResult.data ?? []).map((row) => row.schedule_id);
  const [scheduleResult, meetingsResult, announcementsResult, attendanceResult] = await Promise.all([
    scheduleIds.length ? supabase.from("schedules").select("id,title,starts_at,ends_at,location_id,department_id").in("id", scheduleIds).gte("starts_at", range.start).lt("starts_at", range.end).order("starts_at") : Promise.resolve({ data: [], error: null }),
    supabase.from("meetings").select("id,title,starts_at,location").eq("organization_id", membership.organizationId).gte("starts_at", range.start).lt("starts_at", range.end).order("starts_at"),
    supabase.from("announcements").select("id,title,body,category,created_by,published_at").eq("organization_id", membership.organizationId).order("published_at", { ascending: false }).limit(4),
    supabase.from("attendance_entries").select("clocked_in_at").eq("membership_id", membership.id).is("clocked_out_at", null).maybeSingle(),
  ]);
  for (const result of [scheduleResult, meetingsResult, announcementsResult, attendanceResult]) if (result.error) throw new Error(result.error.message);
  const schedules = scheduleResult.data ?? [];
  const locationIds = Array.from(new Set(schedules.map((row) => row.location_id).filter((id): id is string => Boolean(id))));
  const departmentIds = Array.from(new Set(schedules.map((row) => row.department_id).filter((id): id is string => Boolean(id))));
  const [locations, departments] = await Promise.all([locationIds.length ? supabase.from("locations").select("id,name").in("id", locationIds) : Promise.resolve({ data: [], error: null }), departmentIds.length ? supabase.from("departments").select("id,name").in("id", departmentIds) : Promise.resolve({ data: [], error: null })]);
  const locationMap = new Map((locations.data ?? []).map((row) => [row.id, row.name])); const departmentMap = new Map((departments.data ?? []).map((row) => [row.id, row.name])); const assignmentMap = new Map((assignmentResult.data ?? []).map((row) => [row.schedule_id, row.status]));
  const schedule: ScheduleItem[] = schedules.map((row, index) => ({ id: row.id, time: time(row.starts_at), title: row.title, meta: `${row.location_id ? locationMap.get(row.location_id) ?? "Unassigned" : "Unassigned"} · ${row.department_id ? departmentMap.get(row.department_id) ?? "Unassigned" : "Unassigned"}`, accent: index % 2 ? "green" : "blue", icon: "route" }));
  const duties: Duty[] = schedules.map((row) => ({ id: row.id, title: row.title, context: row.department_id ? departmentMap.get(row.department_id) ?? "Shearwater Operations" : "Shearwater Operations", due: time(row.ends_at), completed: assignmentMap.get(row.id) === "completed" }));
  const allMeetingRows = meetingsResult.data ?? []; const attendeeRows = allMeetingRows.length ? await supabase.from("meeting_attendees").select("meeting_id,user_id").in("meeting_id", allMeetingRows.map((row) => row.id)) : { data: [], error: null }; const myMeetingIds = new Set((attendeeRows.data ?? []).filter((row) => row.user_id === user.userId).map((row) => row.meeting_id)); const meetingRows = allMeetingRows.filter((row) => myMeetingIds.has(row.id));
  const attendeeIds = Array.from(new Set((attendeeRows.data ?? []).map((row) => row.user_id))); const profiles = attendeeIds.length ? await supabase.from("profiles").select("id,first_name,last_name").in("id", attendeeIds) : { data: [], error: null }; const initials = new Map((profiles.data ?? []).map((person) => [person.id, `${person.first_name?.[0] ?? ""}${person.last_name?.[0] ?? ""}`.toUpperCase() || "SW"]));
  const meetings: Meeting[] = meetingRows.map((row) => ({ id: row.id, time: time(row.starts_at), title: row.title, location: row.location ?? "To be confirmed", attendees: (attendeeRows.data ?? []).filter((attendee) => attendee.meeting_id === row.id).map((attendee) => ({ initials: initials.get(attendee.user_id) ?? "SW", color: "#1698C8" })) }));
  const authorIds = Array.from(new Set((announcementsResult.data ?? []).map((item) => item.created_by))); const authorsResult = authorIds.length ? await supabase.from("profiles").select("id,first_name,last_name").in("id", authorIds) : { data: [], error: null }; const authors = new Map((authorsResult.data ?? []).map((person) => [person.id, `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || "Shearwater Team"]));
  const announcements: Announcement[] = (announcementsResult.data ?? []).map((item, index) => ({ id: item.id, label: item.category, title: item.title, body: item.body, author: authors.get(item.created_by) ?? "Shearwater Team", time: new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(-Math.max(0, Math.floor((Date.now() - new Date(item.published_at).getTime()) / 86_400_000)), "day"), accent: index % 2 ? "gold" : "blue" }));
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Harare", hour: "2-digit", hour12: false }).format(new Date()));
  return { user, membership, greeting: hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening", locationName: membership.primaryLocationName ?? "Victoria Falls", dateLabel: new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Harare", weekday: "long", day: "numeric", month: "long" }).format(new Date()), schedule, duties, meetings, announcements, attendance: { clockedIn: Boolean(attendanceResult.data), since: attendanceResult.data ? time(attendanceResult.data.clocked_in_at) : null } };
}
