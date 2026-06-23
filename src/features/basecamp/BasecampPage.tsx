'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/Icon'
import { SectionHeader } from '@/components/SectionHeader'
import { setDutyCompleted, toggleAttendance } from './actions'
import type { BasecampData } from './services/basecamp-service'
import type { Accent, QuickAction } from '@/types/basecamp'

const accents: Record<Accent, { bg: string; text: string; dot: string }> = {
  orange: { bg: 'bg-sunset/10', text: 'text-[#f07862]', dot: 'bg-sunset' }, blue: { bg: 'bg-victoria/10', text: 'text-[#35add8]', dot: 'bg-victoria' },
  gold: { bg: 'bg-gold/10', text: 'text-[#edc15e]', dot: 'bg-gold' }, green: { bg: 'bg-savannah/10', text: 'text-[#72caa3]', dot: 'bg-savannah' }, brown: { bg: 'bg-earth/10', text: 'text-[#cf8a5d]', dot: 'bg-earth' },
}

const quickActions: QuickAction[] = [
  { id: 'duty', label: 'Duties & schedules', href: '/team/schedules', icon: 'plus', accent: 'orange' }, { id: 'meeting', label: 'Schedule meeting', href: '/team/meetings', icon: 'calendar', accent: 'blue' },
  { id: 'update', label: 'Post announcement', href: '/team/communication', icon: 'megaphone', accent: 'gold' }, { id: 'document', label: 'New document', href: '/team/knowledge', icon: 'file', accent: 'green' },
]

export function BasecampPage({ data }: { data: BasecampData }) {
  const [duties, setDuties] = useState(data.duties)
  const [clockedIn, setClockedIn] = useState(data.attendance.clockedIn)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function completeDuty(id: string) {
    const current = duties.find((item) => item.id === id)
    if (!current) return
    setDuties((items) => items.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
    startTransition(async () => {
      try { await setDutyCompleted(id, !current.completed) }
      catch (cause) { setDuties((items) => items.map((item) => item.id === id ? current : item)); setError(cause instanceof Error ? cause.message : 'Unable to update duty.') }
    })
  }

  function changeAttendance() {
    const previous = clockedIn
    setClockedIn(!previous)
    startTransition(async () => {
      try { await toggleAttendance() }
      catch (cause) { setClockedIn(previous); setError(cause instanceof Error ? cause.message : 'Unable to update attendance.') }
    })
  }

  return <div className="animate-in">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sunset">{data.dateLabel}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] text-[#f7f7f2] sm:text-[34px]">{data.greeting}, {data.user.firstName}.</h1><p className="mt-2 text-sm text-[#90908a]">Here is what is happening across {data.membership.organizationName} today.</p></div><div className="flex items-center gap-2 text-xs text-[#83837d]"><Icon name="pin" className="h-3.5 w-3.5 text-victoria"/>{data.locationName}</div></div>
    {error && <button onClick={() => setError(null)} className="mt-5 w-full rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-left text-xs text-[#f18a77]">{error} <span className="float-right">Dismiss</span></button>}
    <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,.75fr)]">
      <div className="space-y-5">
        <section className="card overflow-hidden p-5 sm:p-6"><SectionHeader title="Today's schedule" action="View calendar" actionHref="/team/calendar"/>{data.schedule.length ? <div className="mt-5 grid gap-3 md:grid-cols-3">{data.schedule.map((item) => <Link href={item.href} key={`${item.href}-${item.id}`} className="soft-card group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-[#484843]"><span className={`absolute left-0 top-0 h-full w-0.75 ${accents[item.accent].dot}`}/><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-[#aaa9a2]">{item.time}</span><div className={`grid h-8 w-8 place-items-center rounded-lg ${accents[item.accent].bg} ${accents[item.accent].text}`}><Icon name={item.icon} className="h-4 w-4"/></div></div><h3 className="mt-5 text-sm font-semibold leading-snug text-[#edede8]">{item.title}</h3><p className="mt-1.5 text-[11px] text-[#777772]">{item.meta}</p></Link>)}</div> : <EmptyState icon="calendar" title="Nothing scheduled today" body="Today's meetings and assigned duties will appear here."/>}</section>
        <CalendarPanel days={data.calendar}/>
        <section className="card p-5 sm:p-6"><SectionHeader title="Today's duties" action="All duties"/>{duties.length ? <div className="mt-3 divide-y divide-[#30302d]">{duties.map((duty) => <div key={duty.id} className="flex items-center gap-3 py-3.5"><button disabled={pending} aria-label={`${duty.completed ? 'Reopen' : 'Complete'} ${duty.title}`} onClick={() => completeDuty(duty.id)} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${duty.completed ? 'border-savannah bg-savannah text-[#10281d]' : 'border-[#55554f] hover:border-savannah'}`}>{duty.completed && <Icon name="check" className="h-3.5 w-3.5"/>}</button><div className="min-w-0 flex-1"><p className={`truncate text-sm font-medium ${duty.completed ? 'text-[#6f6f69] line-through' : 'text-[#e5e5df]'}`}>{duty.title}</p><p className="mt-1 text-[11px] text-[#777772]">{duty.context}</p></div><span className="flex w-20 items-center justify-end gap-1 text-[11px] text-[#85857e]"><Icon name="clock" className="h-3 w-3"/>Ends {duty.due}</span></div>)}</div> : <EmptyState icon="check" title="No duties today" body="Assigned duties and schedules will appear here."/>}</section>
        <section className="card p-5 sm:p-6"><SectionHeader title="Announcements" action="View all"/>{data.announcements.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.announcements.map((item) => <article key={item.id} className="soft-card p-4"><div className="flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${accents[item.accent].bg} ${accents[item.accent].text}`}>{item.label}</span><span className="text-[10px] text-[#696963]">{item.time}</span></div><h3 className="mt-4 text-sm font-semibold text-[#ebebe5]">{item.title}</h3><p className="mt-2 text-xs leading-5 text-[#92928c]">{item.body}</p><p className="mt-4 text-[10px] font-medium text-[#777771]">Posted by {item.author}</p></article>)}</div> : <EmptyState icon="megaphone" title="No announcements" body="Published company updates will appear here."/>}</section>
      </div>
      <aside className="space-y-5">
        <section className="card overflow-hidden"><div className="relative p-5"><div className="absolute inset-x-0 top-0 h-0.75 bg-linear-to-r from-sunset via-gold to-savannah"/><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#74746e]">Attendance</p><div className="mt-3 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${clockedIn ? 'bg-savannah shadow-[0_0_10px_#58B88D]' : 'bg-[#666]'}`}/><h2 className="text-lg font-semibold text-white">{clockedIn ? 'Clocked in' : 'Clocked out'}</h2></div></div><Icon name="shield" className="h-5 w-5 text-savannah"/></div><p className="mt-2 text-xs text-[#85857f]">{clockedIn ? `Since ${data.attendance.since ?? 'just now'} · ${data.locationName}` : 'You are currently off duty'}</p><button disabled={pending} onClick={changeAttendance} className="mt-5 w-full rounded-xl border border-[#40403c] bg-[#292927] py-2.5 text-xs font-semibold text-[#d6d6cf] transition hover:border-[#55554f] hover:bg-[#30302e] disabled:opacity-60">{clockedIn ? 'Clock out' : 'Clock in'}</button></div></section>
        <section className="card p-5"><SectionHeader title="Quick actions"/><div className="mt-4 grid grid-cols-2 gap-2">{quickActions.map((action) => <Link key={action.id} href={action.href} className="rounded-xl border border-[#343431] bg-[#242422] p-3 text-left transition hover:border-[#4b4b46] hover:bg-[#292927]"><div className={`grid h-8 w-8 place-items-center rounded-lg ${accents[action.accent].bg} ${accents[action.accent].text}`}><Icon name={action.icon} className="h-4 w-4"/></div><p className="mt-3 text-[11px] font-semibold text-[#c8c8c1]">{action.label}</p></Link>)}</div></section>
        <section className="card p-5"><SectionHeader title="Upcoming meetings" action="Open meetings"/>{data.meetings.length ? <div className="mt-2 divide-y divide-[#30302d]">{data.meetings.slice(0, 6).map((meeting) => <Link href="/team/meetings" key={meeting.id} className="block py-4 transition hover:bg-white/2"><div className="flex gap-3"><div className="w-16 pt-0.5"><p className="text-[10px] font-semibold text-[#888]">{meeting.date}</p><p className="mt-1 text-xs font-semibold text-victoria">{meeting.time}</p></div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#e1e1db]">{meeting.title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#797973]"><Icon name="pin" className="h-3 w-3"/>{meeting.location}</p>{meeting.attendees.length > 0 && <div className="mt-3 flex -space-x-1.5">{meeting.attendees.map((person, index) => <span key={`${meeting.id}-${person.initials}-${index}`} style={{ backgroundColor: person.color }} className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#1e1e1d] text-[7px] font-bold text-white">{person.initials}</span>)}</div>}</div></div></Link>)}</div> : <EmptyState icon="users" title="No upcoming meetings" body="Meetings for the next 14 days will appear here." compact/>}</section>
      </aside>
    </div>
    <Link href="/team/harold" className="relative mt-5 block overflow-hidden rounded-[20px] border border-[#343431] bg-[#1d1d1c] p-5 transition hover:border-victoria/40 sm:p-6"><div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-victoria/10 blur-3xl"/><div className="relative flex items-center justify-between gap-5"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br from-victoria/20 to-savannah/10 text-victoria"><Icon name="sparkles" className="h-5 w-5"/></div><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-white">Open Harold</h2><span className="rounded bg-victoria/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-victoria">n8n workflow</span></div><p className="mt-1 text-[11px] text-[#777772]">Ask Harold securely or hand the conversation to a Team Access member.</p></div></div><Icon name="arrow" className="h-5 w-5 text-victoria"/></div></Link>
  </div>
}

function EmptyState({ icon, title, body, compact = false }: { icon: 'calendar' | 'check' | 'megaphone' | 'users'; title: string; body: string; compact?: boolean }) {
  return <div className={`${compact ? 'py-7' : 'mt-4 py-9'} text-center`}><div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-[#292927] text-[#73736d]"><Icon name={icon} className="h-4 w-4"/></div><p className="mt-3 text-xs font-semibold text-[#b9b9b2]">{title}</p><p className="mt-1 text-[10px] text-[#696963]">{body}</p></div>
}

function CalendarPanel({ days }: { days: BasecampData['calendar'] }) {
  const eventCount = days.reduce((total, day) => total + day.events.length, 0)
  return <section className="card overflow-hidden p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-victoria">Operational calendar</p><h2 className="mt-2 text-base font-semibold text-white">The next 7 days</h2></div><Link href="/team/meetings" className="text-[11px] font-semibold text-victoria hover:text-[#54b9df]">Full meeting schedule</Link></div><div className="mt-5 overflow-x-auto pb-2"><div className="grid min-w-190 grid-cols-7 gap-2">{days.map((day) => <div key={day.key} className={`min-h-36 rounded-xl border p-3 ${day.isToday ? 'border-sunset/50 bg-sunset/5' : 'border-[#353532] bg-[#222220]'}`}><div className="flex items-center justify-between"><div><p className={`text-[10px] font-bold uppercase tracking-wider ${day.isToday ? 'text-sunset' : 'text-[#777]'}`}>{day.weekday}</p><p className="mt-1 text-lg font-semibold text-white">{day.day} <span className="text-[10px] font-medium text-[#6f6f69]">{day.month}</span></p></div>{day.events.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-victoria/10 px-1 text-[9px] font-bold text-victoria">{day.events.length}</span>}</div><div className="mt-3 space-y-2">{day.events.slice(0, 3).map((event) => <Link href={event.href} key={event.id} className="block rounded-lg border border-[#363633] bg-[#292927] p-2 transition hover:border-[#4a4a45]"><div className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${event.kind === 'meeting' ? 'bg-gold' : 'bg-savannah'}`}/><span className="text-[9px] font-semibold text-[#999]">{event.time}</span></div><p className="mt-1 truncate text-[10px] font-medium text-[#deded8]">{event.title}</p></Link>)}{day.events.length > 3 && <p className="text-[9px] text-[#777]">+{day.events.length - 3} more</p>}</div></div>)}</div></div>{eventCount === 0 && <p className="mt-3 text-center text-[10px] text-[#6f6f69]">No meetings or duties are scheduled in the next seven days.</p>}<div className="mt-3 flex gap-4 text-[9px] text-[#777]"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-gold"/>Meetings</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-savannah"/>Duties</span></div></section>
}
