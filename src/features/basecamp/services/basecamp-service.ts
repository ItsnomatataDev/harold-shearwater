import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { ActiveMembership, AuthContext } from '@/features/auth/services/auth-context'
import type { Announcement, Meeting, ScheduleItem, Task } from '@/types/basecamp'

export interface BasecampData {
  user: AuthContext
  membership: ActiveMembership
  locationName: string
  dateLabel: string
  schedule: ScheduleItem[]
  tasks: Task[]
  meetings: Meeting[]
  announcements: Announcement[]
  attendance: { clockedIn: boolean; since: string | null }
}

function harareDayRange() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Harare', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const date = `${value('year')}-${value('month')}-${value('day')}`
  const start = new Date(`${date}T00:00:00+02:00`)
  const end = new Date(start.getTime() + 86_400_000)
  return { start: start.toISOString(), end: end.toISOString(), date }
}

const time = (value: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Harare', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))

export async function getBasecampData(user: AuthContext, membership: ActiveMembership): Promise<BasecampData> {
  if (!membership.organizationId) throw new Error('Team membership is missing an organization.')
  const supabase = await createClient()
  const range = harareDayRange()
  const [tasksResult, meetingsResult, announcementsResult, attendanceResult, locationResult] = await Promise.all([
    supabase.from('tasks').select('id,title,context,due_at,priority,status').eq('organization_id', membership.organizationId).gte('due_at', range.start).lt('due_at', range.end).order('due_at'),
    supabase.from('meetings').select('id,title,starts_at,location').eq('organization_id', membership.organizationId).gte('starts_at', range.start).lt('starts_at', range.end).order('starts_at'),
    supabase.from('announcements').select('id,title,body,category,published_at').eq('organization_id', membership.organizationId).order('published_at', { ascending: false }).limit(4),
    supabase.from('attendance_entries').select('clocked_in_at').eq('membership_id', membership.id).is('clocked_out_at', null).maybeSingle(),
    membership.primaryLocationId ? supabase.from('locations').select('name').eq('id', membership.primaryLocationId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])
  for (const result of [tasksResult, meetingsResult, announcementsResult, attendanceResult, locationResult]) {
    if (result.error) throw new Error(result.error.message)
  }
  const meetingRows = meetingsResult.data ?? []
  const attendeeMap = new Map<string, { initials: string; color: string }[]>()
  if (meetingRows.length) {
    const { data: attendeeRows } = await supabase.from('meeting_attendees').select('meeting_id,user_id').in('meeting_id', meetingRows.map((item) => item.id))
    const userIds = [...new Set((attendeeRows ?? []).map((item) => item.user_id))]
    const { data: people } = userIds.length ? await supabase.from('profiles').select('id,first_name,last_name').in('id', userIds) : { data: [] }
    const peopleMap = new Map((people ?? []).map((person) => [person.id, `${person.first_name?.charAt(0) ?? ''}${person.last_name?.charAt(0) ?? ''}`.toUpperCase() || 'SW']))
    for (const attendee of attendeeRows ?? []) attendeeMap.set(attendee.meeting_id, [...(attendeeMap.get(attendee.meeting_id) ?? []), { initials: peopleMap.get(attendee.user_id) ?? 'SW', color: '#1698C8' }])
  }
  const tasks: Task[] = (tasksResult.data ?? []).map((item) => ({ id: item.id, title: item.title, context: item.context ?? 'Shearwater Operations', due: item.due_at ? time(item.due_at) : 'Today', priority: item.priority === 'urgent' ? 'Urgent' : item.priority.charAt(0).toUpperCase() + item.priority.slice(1) as Task['priority'], completed: item.status === 'completed' }))
  const meetings: Meeting[] = meetingRows.map((item) => ({ id: item.id, time: time(item.starts_at), title: item.title, location: item.location ?? 'Online', attendees: attendeeMap.get(item.id) ?? [] }))
  const announcements: Announcement[] = (announcementsResult.data ?? []).map((item, index) => ({ id: item.id, label: item.category, title: item.title, body: item.body, author: 'Shearwater Team', time: new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.max(0, Math.floor((Date.now() - new Date(item.published_at).getTime()) / 86_400_000)), 'day'), accent: index % 2 ? 'gold' : 'blue' }))
  const schedule: ScheduleItem[] = meetings.map((item, index) => ({ id: item.id, time: item.time, title: item.title, meta: item.location, accent: index % 2 ? 'green' : 'blue', icon: 'users' }))
  return {
    user, membership,
    locationName: locationResult.data?.name ?? 'Victoria Falls',
    dateLabel: new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Harare', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    schedule, tasks, meetings, announcements,
    attendance: { clockedIn: Boolean(attendanceResult.data), since: attendanceResult.data ? time(attendanceResult.data.clocked_in_at) : null },
  }
}
