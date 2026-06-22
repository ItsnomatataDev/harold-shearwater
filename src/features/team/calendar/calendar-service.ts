import "server-only";

import { createClient } from "@/lib/supabase/server";

export type OperationsCalendarEvent = {
  id: string;
  sourceId: string;
  kind: "meeting" | "duty";
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  dateKey: string;
  location: string;
  status: string;
  href: string;
};

export type OperationsCalendarDay = {
  key: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

export interface OperationsCalendarData {
  monthKey: string;
  monthLabel: string;
  todayKey: string;
  days: OperationsCalendarDay[];
  events: OperationsCalendarEvent[];
}

function validMonth(value: string | undefined) {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare", year: "numeric", month: "2-digit" }).format(new Date());
}

const dateKey = (value: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare" }).format(new Date(value));

export async function getOperationsCalendarData(organizationId: string, membershipId: string, userId: string, requestedMonth?: string): Promise<OperationsCalendarData> {
  const supabase = await createClient();
  const monthKey = validMonth(requestedMonth);
  const [year, month] = monthKey.split("-").map(Number);
  const logicalMonthStart = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (logicalMonthStart.getUTCDay() + 6) % 7;
  const logicalGridStart = new Date(Date.UTC(year, month - 1, 1 - mondayOffset));
  const logicalGridEnd = new Date(logicalGridStart.getTime() + 42 * 86_400_000);
  const gridStartKey = logicalGridStart.toISOString().slice(0, 10);
  const gridEndKey = logicalGridEnd.toISOString().slice(0, 10);
  const queryStart = new Date(`${gridStartKey}T00:00:00+02:00`).toISOString();
  const queryEnd = new Date(`${gridEndKey}T00:00:00+02:00`).toISOString();

  const assignments = await supabase.from("schedule_assignments").select("schedule_id,status").eq("membership_id", membershipId);
  if (assignments.error) throw new Error(assignments.error.message);
  const scheduleIds = (assignments.data ?? []).map((item) => item.schedule_id);

  const [schedules, meetings] = await Promise.all([
    scheduleIds.length ? supabase.from("schedules").select("id,title,description,starts_at,ends_at,location_id").in("id", scheduleIds).gte("starts_at", queryStart).lt("starts_at", queryEnd).order("starts_at") : Promise.resolve({ data: [], error: null }),
    supabase.from("meetings").select("id,title,description,starts_at,ends_at,location").eq("organization_id", organizationId).gte("starts_at", queryStart).lt("starts_at", queryEnd).order("starts_at"),
  ]);
  if (schedules.error) throw new Error(schedules.error.message);
  if (meetings.error) throw new Error(meetings.error.message);

  const meetingRows = meetings.data ?? [];
  const attendees = meetingRows.length ? await supabase.from("meeting_attendees").select("meeting_id,user_id,response").in("meeting_id", meetingRows.map((item) => item.id)) : { data: [], error: null };
  if (attendees.error) throw new Error(attendees.error.message);
  const myMeetingResponses = new Map((attendees.data ?? []).filter((item) => item.user_id === userId && item.response !== "declined").map((item) => [item.meeting_id, item.response]));
  const locationIds = Array.from(new Set((schedules.data ?? []).map((item) => item.location_id).filter((id): id is string => Boolean(id))));
  const locations = locationIds.length ? await supabase.from("locations").select("id,name").in("id", locationIds) : { data: [], error: null };
  if (locations.error) throw new Error(locations.error.message);
  const locationNames = new Map((locations.data ?? []).map((item) => [item.id, item.name]));
  const assignmentStatus = new Map((assignments.data ?? []).map((item) => [item.schedule_id, item.status]));

  const events: OperationsCalendarEvent[] = [
    ...(schedules.data ?? []).map((item) => ({ id: `duty-${item.id}`, sourceId: item.id, kind: "duty" as const, title: item.title, description: item.description, startsAt: item.starts_at, endsAt: item.ends_at, dateKey: dateKey(item.starts_at), location: item.location_id ? locationNames.get(item.location_id) ?? "Unassigned" : "Unassigned", status: assignmentStatus.get(item.id) ?? "assigned", href: "/team/schedules" })),
    ...meetingRows.filter((item) => myMeetingResponses.has(item.id)).map((item) => ({ id: `meeting-${item.id}`, sourceId: item.id, kind: "meeting" as const, title: item.title, description: item.description, startsAt: item.starts_at, endsAt: item.ends_at, dateKey: dateKey(item.starts_at), location: item.location ?? "To be confirmed", status: myMeetingResponses.get(item.id) ?? "needs_action", href: "/team/meetings" })),
  ].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const todayKey = dateKey(new Date());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(logicalGridStart.getTime() + index * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    return { key, day: date.getUTCDate(), inMonth: date.getUTCMonth() === month - 1, isToday: key === todayKey };
  });
  return { monthKey, monthLabel: new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" }).format(logicalMonthStart), todayKey, days, events };
}
