'use client'

import { useState, useTransition } from 'react'
import { Icon } from '@/components/Icon'
import { SectionHeader } from '@/components/SectionHeader'
import { setTaskCompleted, toggleAttendance } from './actions'
import type { BasecampData } from './services/basecamp-service'
import type { Accent, QuickAction } from '@/types/basecamp'

const accents: Record<Accent, { bg: string; text: string; dot: string }> = {
  orange: { bg: 'bg-sunset/10', text: 'text-[#f07862]', dot: 'bg-sunset' }, blue: { bg: 'bg-victoria/10', text: 'text-[#35add8]', dot: 'bg-victoria' },
  gold: { bg: 'bg-gold/10', text: 'text-[#edc15e]', dot: 'bg-gold' }, green: { bg: 'bg-savannah/10', text: 'text-[#72caa3]', dot: 'bg-savannah' }, brown: { bg: 'bg-earth/10', text: 'text-[#cf8a5d]', dot: 'bg-earth' },
}

const quickActions: QuickAction[] = [
  { id: 'task', label: 'Create task', icon: 'plus', accent: 'orange' }, { id: 'meeting', label: 'Schedule meeting', icon: 'calendar', accent: 'blue' },
  { id: 'update', label: 'Post update', icon: 'megaphone', accent: 'gold' }, { id: 'document', label: 'New document', icon: 'file', accent: 'green' },
]

export function BasecampPage({ data }: { data: BasecampData }) {
  const [tasks, setTasks] = useState(data.tasks)
  const [clockedIn, setClockedIn] = useState(data.attendance.clockedIn)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function completeTask(id: string) {
    const current = tasks.find((item) => item.id === id)
    if (!current) return
    setTasks((items) => items.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
    startTransition(async () => {
      try { await setTaskCompleted(id, !current.completed) }
      catch (cause) { setTasks((items) => items.map((item) => item.id === id ? current : item)); setError(cause instanceof Error ? cause.message : 'Unable to update task.') }
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
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sunset">{data.dateLabel}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.035em] text-[#f7f7f2] sm:text-[34px]">Good morning, {data.user.firstName}.</h1><p className="mt-2 text-sm text-[#90908a]">Here is what is happening across {data.membership.organizationName} today.</p></div><div className="flex items-center gap-2 text-xs text-[#83837d]"><Icon name="pin" className="h-3.5 w-3.5 text-victoria"/>{data.locationName}</div></div>
    {error && <button onClick={() => setError(null)} className="mt-5 w-full rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-left text-xs text-[#f18a77]">{error} <span className="float-right">Dismiss</span></button>}
    <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,.75fr)]">
      <div className="space-y-5">
        <section className="card overflow-hidden p-5 sm:p-6"><SectionHeader title="Today's schedule" action="View calendar"/>{data.schedule.length ? <div className="mt-5 grid gap-3 md:grid-cols-3">{data.schedule.map((item) => <div key={item.id} className="soft-card group relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-[#484843]"><span className={`absolute left-0 top-0 h-full w-[3px] ${accents[item.accent].dot}`}/><div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-[#aaa9a2]">{item.time}</span><div className={`grid h-8 w-8 place-items-center rounded-lg ${accents[item.accent].bg} ${accents[item.accent].text}`}><Icon name={item.icon} className="h-4 w-4"/></div></div><h3 className="mt-5 text-sm font-semibold leading-snug text-[#edede8]">{item.title}</h3><p className="mt-1.5 text-[11px] text-[#777772]">{item.meta}</p></div>)}</div> : <EmptyState icon="calendar" title="No meetings scheduled" body="Meetings scheduled for today will appear here."/>}</section>
        <section className="card p-5 sm:p-6"><SectionHeader title="Tasks due today" action="All tasks"/>{tasks.length ? <div className="mt-3 divide-y divide-[#30302d]">{tasks.map((task) => <div key={task.id} className="flex items-center gap-3 py-3.5"><button disabled={pending} aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => completeTask(task.id)} className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${task.completed ? 'border-savannah bg-savannah text-[#10281d]' : 'border-[#55554f] hover:border-savannah'}`}>{task.completed && <Icon name="check" className="h-3.5 w-3.5"/>}</button><div className="min-w-0 flex-1"><p className={`truncate text-sm font-medium ${task.completed ? 'text-[#6f6f69] line-through' : 'text-[#e5e5df]'}`}>{task.title}</p><p className="mt-1 text-[11px] text-[#777772]">{task.context}</p></div><span className={`hidden rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wider sm:block ${task.priority === 'Urgent' || task.priority === 'High' ? 'bg-sunset/10 text-[#ef745e]' : task.priority === 'Medium' ? 'bg-gold/10 text-[#dfb34f]' : 'bg-[#343431] text-[#969690]'}`}>{task.priority}</span><span className="flex w-12 items-center justify-end gap-1 text-[11px] text-[#85857e]"><Icon name="clock" className="h-3 w-3"/>{task.due}</span></div>)}</div> : <EmptyState icon="check" title="Nothing due today" body="Tasks assigned to today will appear here."/>}</section>
        <section className="card p-5 sm:p-6"><SectionHeader title="Announcements" action="View all"/>{data.announcements.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.announcements.map((item) => <article key={item.id} className="soft-card p-4"><div className="flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] ${accents[item.accent].bg} ${accents[item.accent].text}`}>{item.label}</span><span className="text-[10px] text-[#696963]">{item.time}</span></div><h3 className="mt-4 text-sm font-semibold text-[#ebebe5]">{item.title}</h3><p className="mt-2 text-xs leading-5 text-[#92928c]">{item.body}</p><p className="mt-4 text-[10px] font-medium text-[#777771]">Posted by {item.author}</p></article>)}</div> : <EmptyState icon="megaphone" title="No announcements" body="Published company updates will appear here."/>}</section>
      </div>
      <aside className="space-y-5">
        <section className="card overflow-hidden"><div className="relative p-5"><div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sunset via-gold to-savannah"/><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#74746e]">Attendance</p><div className="mt-3 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${clockedIn ? 'bg-savannah shadow-[0_0_10px_#58B88D]' : 'bg-[#666]'}`}/><h2 className="text-lg font-semibold text-white">{clockedIn ? 'Clocked in' : 'Clocked out'}</h2></div></div><Icon name="shield" className="h-5 w-5 text-savannah"/></div><p className="mt-2 text-xs text-[#85857f]">{clockedIn ? `Since ${data.attendance.since ?? 'just now'} · ${data.locationName}` : 'You are currently off duty'}</p><button disabled={pending} onClick={changeAttendance} className="mt-5 w-full rounded-xl border border-[#40403c] bg-[#292927] py-2.5 text-xs font-semibold text-[#d6d6cf] transition hover:border-[#55554f] hover:bg-[#30302e] disabled:opacity-60">{clockedIn ? 'Clock out' : 'Clock in'}</button></div></section>
        <section className="card p-5"><SectionHeader title="Quick actions"/><div className="mt-4 grid grid-cols-2 gap-2">{quickActions.map((action) => <button key={action.id} disabled title="This operational module is not enabled yet" className="rounded-xl border border-[#343431] bg-[#242422] p-3 text-left opacity-60"><div className={`grid h-8 w-8 place-items-center rounded-lg ${accents[action.accent].bg} ${accents[action.accent].text}`}><Icon name={action.icon} className="h-4 w-4"/></div><p className="mt-3 text-[11px] font-semibold text-[#c8c8c1]">{action.label}</p></button>)}</div><p className="mt-3 text-[10px] text-[#65655f]">Actions unlock as their real workflows are connected.</p></section>
        <section className="card p-5"><SectionHeader title="Meetings" action="Schedule"/>{data.meetings.length ? <div className="mt-2 divide-y divide-[#30302d]">{data.meetings.map((meeting) => <div key={meeting.id} className="py-4"><div className="flex gap-3"><div className="w-11 pt-0.5 text-xs font-semibold text-victoria">{meeting.time}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#e1e1db]">{meeting.title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-[#797973]"><Icon name="pin" className="h-3 w-3"/>{meeting.location}</p>{meeting.attendees.length > 0 && <div className="mt-3 flex -space-x-1.5">{meeting.attendees.map((person, index) => <span key={`${meeting.id}-${person.initials}-${index}`} style={{ backgroundColor: person.color }} className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#1e1e1d] text-[7px] font-bold text-white">{person.initials}</span>)}</div>}</div></div></div>)}</div> : <EmptyState icon="users" title="No meetings" body="Today's meetings will appear here." compact/>}</section>
      </aside>
    </div>
    <section className="relative mt-5 overflow-hidden rounded-[20px] border border-[#343431] bg-[#1d1d1c] p-5 sm:p-6"><div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-victoria/10 blur-3xl"/><div className="relative flex flex-col gap-5 lg:flex-row lg:items-center"><div className="flex min-w-64 items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-victoria/20 to-savannah/10 text-victoria"><Icon name="sparkles" className="h-5 w-5"/></div><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold text-white">Ask Harold</h2><span className="rounded bg-gold/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-gold">Not connected</span></div><p className="mt-1 text-[11px] text-[#777772]">Harold will activate after the governed knowledge layer is ready.</p></div></div><div className="flex flex-1 items-center rounded-xl border border-[#343431] bg-[#242422] p-1.5 opacity-60"><Icon name="sparkles" className="ml-2 h-4 w-4 text-[#74746e]"/><input disabled aria-label="Ask Harold" placeholder="AI actions are intentionally disabled…" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder:text-[#686862]"/><button disabled aria-label="Send question" className="grid h-8 w-8 place-items-center rounded-lg bg-[#3b3b37] text-[#777]"><Icon name="send" className="h-3.5 w-3.5"/></button></div></div></section>
  </div>
}

function EmptyState({ icon, title, body, compact = false }: { icon: 'calendar' | 'check' | 'megaphone' | 'users'; title: string; body: string; compact?: boolean }) {
  return <div className={`${compact ? 'py-7' : 'mt-4 py-9'} text-center`}><div className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-[#292927] text-[#73736d]"><Icon name={icon} className="h-4 w-4"/></div><p className="mt-3 text-xs font-semibold text-[#b9b9b2]">{title}</p><p className="mt-1 text-[10px] text-[#696963]">{body}</p></div>
}
