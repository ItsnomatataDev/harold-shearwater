"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { MeetingView } from "../meeting-service";
import { createMeeting, respondToMeeting } from "../meeting-actions";

const format = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Harare", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const isToday = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare" }).format(new Date(value)) === new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare" }).format(new Date());

export function MeetingsWorkspace({ meetings, staff, canManage, organizationId }: { meetings: MeetingView[]; staff: Array<{ userId: string; name: string; email: string }>; canManage: boolean; organizationId: string }) {
  const [open, setOpen] = useState(false);
  const today = meetings.filter((meeting) => isToday(meeting.startsAt));
  const upcoming = meetings.filter((meeting) => !isToday(meeting.startsAt));
  return <div className="space-y-6">
    {canManage && <div className="flex justify-end"><button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-xl bg-sunset px-4 py-2.5 text-xs font-semibold text-white"><Icon name="plus" className="h-4 w-4"/>Schedule meeting</button></div>}
    {open && <CreateMeetingForm organizationId={organizationId} staff={staff} onDone={() => setOpen(false)} />}
    <MeetingGroup title="Today" meetings={today} />
    <MeetingGroup title="Upcoming" meetings={upcoming} />
  </div>;
}

function MeetingGroup({ title, meetings }: { title: string; meetings: MeetingView[] }) { return <section className="space-y-3"><h2 className="text-lg font-semibold text-white">{title}</h2>{meetings.length ? <div className="grid gap-4 xl:grid-cols-2">{meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}</div> : <div className="rounded-2xl border border-dashed border-[#3b3b38] px-6 py-9 text-center text-xs text-[#777771]">No {title.toLowerCase()} meetings.</div>}</section>; }

function MeetingCard({ meeting }: { meeting: MeetingView }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  const respond = (response: "accepted" | "declined" | "tentative") => startTransition(async () => { try { setError(null); await respondToMeeting(meeting.id, response); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to respond."); } });
  return <article className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-5"><p className="text-xs font-semibold text-victoria">{format(meeting.startsAt)}{meeting.endsAt ? ` – ${format(meeting.endsAt)}` : ""}</p><h3 className="mt-2 text-base font-semibold text-white">{meeting.title}</h3><p className="mt-2 flex items-center gap-1.5 text-xs text-[#8b8b85]"><Icon name="pin" className="h-3.5 w-3.5" />{meeting.location}</p>{meeting.description && <p className="mt-3 text-xs leading-5 text-[#8b8b85]">{meeting.description}</p>}<div className="mt-4 border-t border-[#30302d] pt-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e6e68]">Attendees</p><div className="mt-2 flex flex-wrap gap-2">{meeting.attendees.map((person) => <span key={person.userId} title={person.email} className="rounded-full bg-[#2c2c29] px-2.5 py-1 text-[10px] text-[#c6c6bf]">{person.name} · {person.response.replace("_", " ")}</span>)}</div></div>{meeting.myResponse && <div className="mt-4 flex flex-wrap gap-2">{(["accepted", "tentative", "declined"] as const).map((response) => <button disabled={pending} key={response} onClick={() => respond(response)} className={`rounded-lg border px-3 py-2 text-[10px] font-semibold capitalize ${meeting.myResponse === response ? "border-victoria bg-victoria/10 text-victoria" : "border-[#41413d] text-[#aaa9a2]"}`}>{response}</button>)}</div>}{error && <p className="mt-3 text-xs text-sunset">{error}</p>}</article>;
}

function CreateMeetingForm({ organizationId, staff, onDone }: { organizationId: string; staff: Array<{ userId: string; name: string; email: string }>; onDone: () => void }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <form className="grid gap-4 rounded-2xl border border-[#40403c] bg-[#1d1d1b] p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { setError(null); await createMeeting(organizationId, { title: form.get("title"), description: form.get("description"), startsAt: new Date(String(form.get("startsAt"))).toISOString(), endsAt: form.get("endsAt") ? new Date(String(form.get("endsAt"))).toISOString() : undefined, location: form.get("location"), attendeeIds: form.getAll("attendees") }); onDone(); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create meeting."); } }); }}><label className="space-y-2"><span className="text-xs text-[#92928c]">Title</span><input name="title" required className="input"/></label><label className="space-y-2"><span className="text-xs text-[#92928c]">Location</span><input name="location" className="input"/></label><label className="space-y-2"><span className="text-xs text-[#92928c]">Starts</span><input name="startsAt" type="datetime-local" required className="input"/></label><label className="space-y-2"><span className="text-xs text-[#92928c]">Ends</span><input name="endsAt" type="datetime-local" className="input"/></label><label className="space-y-2 sm:col-span-2"><span className="text-xs text-[#92928c]">Agenda / description</span><textarea name="description" rows={3} className="input"/></label><label className="space-y-2 sm:col-span-2"><span className="text-xs text-[#92928c]">Attendees</span><select name="attendees" multiple required className="input min-h-32">{staff.map((person) => <option key={person.userId} value={person.userId}>{person.name} · {person.email}</option>)}</select></label>{error && <p className="sm:col-span-2 text-xs text-sunset">{error}</p>}<div className="sm:col-span-2 flex justify-end"><button disabled={pending} className="rounded-xl bg-sunset px-5 py-2.5 text-xs font-semibold text-white">{pending ? "Scheduling…" : "Schedule meeting"}</button></div></form>;
}
