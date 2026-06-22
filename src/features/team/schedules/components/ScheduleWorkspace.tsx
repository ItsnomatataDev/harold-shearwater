"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { ScheduleDuty, ScheduleWorkspaceData } from "../schedule-service";
import { addHandoverNote, completeDuty, createDuty } from "../schedule-actions";

const dayKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare" }).format(new Date(value));
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Harare" }).format(new Date());
const dateTime = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Harare", weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export function ScheduleWorkspace({ data, organizationId, canManage }: { data: ScheduleWorkspaceData; organizationId: string; canManage: boolean }) {
  const router = useRouter();
  const [view, setView] = useState<"today" | "week" | "month">("week");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const rangeEnd = new Date(rangeStart.getTime() + (view === "week" ? 7 : 31) * 86_400_000);
  const duties = data.duties.filter((duty) => {
    if (view === "today") return dayKey(duty.startsAt) === todayKey();
    return new Date(duty.startsAt) >= rangeStart && new Date(duty.startsAt) < rangeEnd;
  });

  const run = (action: () => Promise<unknown>) => startTransition(async () => { try { setError(null); await action(); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update duty."); } });

  return <div className="space-y-5">
    {error && <p className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex rounded-xl border border-[#343431] bg-[#1d1d1b] p-1">{(["today", "week", "month"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize ${view === item ? "bg-[#333330] text-white" : "text-[#85857f]"}`}>{item}</button>)}</div>
      {canManage && <button onClick={() => setCreateOpen(!createOpen)} className="flex items-center gap-2 rounded-xl bg-sunset px-4 py-2.5 text-xs font-semibold text-white"><Icon name="plus" className="h-4 w-4" />Create duty</button>}
    </div>
    {createOpen && <CreateDutyForm data={data} organizationId={organizationId} onDone={() => { setCreateOpen(false); router.refresh(); }} />}
    {duties.length ? <div className="grid gap-4 xl:grid-cols-2">{duties.map((duty) => <DutyCard key={duty.id} duty={duty} canManage={canManage} pending={pending} run={run} />)}</div> : <div className="rounded-2xl border border-dashed border-[#3b3b38] bg-[#1a1a18] px-6 py-12 text-center"><p className="text-sm font-semibold text-[#d7d7d0]">No duties in this period</p><p className="mt-2 text-xs text-[#777771]">Assigned duties and roster entries will appear here.</p></div>}
  </div>;
}

function DutyCard({ duty, canManage, pending, run }: { duty: ScheduleDuty; canManage: boolean; pending: boolean; run: (action: () => Promise<unknown>) => void }) {
  const [note, setNote] = useState("");
  return <article className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-5">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold text-victoria">{dateTime(duty.startsAt)}</p><h3 className="mt-2 text-base font-semibold text-white">{duty.title}</h3></div><span className="rounded-full bg-[#30302d] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#aaa9a2]">{duty.myAssignmentStatus ?? duty.status}</span></div>
    {duty.description && <p className="mt-3 text-xs leading-5 text-[#8d8d87]">{duty.description}</p>}
    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[#696963]">Location</dt><dd className="mt-1 text-[#d3d3cc]">{duty.locationName}</dd></div><div><dt className="text-[#696963]">Department</dt><dd className="mt-1 text-[#d3d3cc]">{duty.departmentName}</dd></div><div><dt className="text-[#696963]">Ends</dt><dd className="mt-1 text-[#d3d3cc]">{dateTime(duty.endsAt)}</dd></div><div><dt className="text-[#696963]">Supervisor</dt><dd className="mt-1 text-[#d3d3cc]">{duty.supervisorName}</dd></div></dl>
    {(canManage || duty.assignedStaff.length > 1) && <div className="mt-4 border-t border-[#30302d] pt-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-[#71716b]">Assigned staff</p><p className="mt-2 text-xs text-[#aaa9a2]">{duty.assignedStaff.map((person) => person.name).join(", ") || "No staff assigned"}</p></div>}
    {duty.notes.length > 0 && <div className="mt-4 space-y-2">{duty.notes.map((item) => <div key={item.id} className="rounded-xl bg-[#252523] p-3 text-xs text-[#b8b8b1]"><p>{item.body}</p><p className="mt-2 text-[10px] text-[#6f6f69]">{item.authorName} · {dateTime(item.createdAt)}</p></div>)}</div>}
    {duty.myAssignmentStatus && duty.myAssignmentStatus !== "completed" && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><button disabled={pending} onClick={() => run(() => completeDuty(duty.id))} className="rounded-xl bg-savannah px-3 py-2 text-xs font-semibold text-[#102018]">Complete duty</button><form className="flex flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); if (!note.trim()) return; run(async () => { await addHandoverNote(duty.id, note); setNote(""); }); }}><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add handover note" className="min-w-0 flex-1 rounded-xl border border-[#3a3a36] bg-[#232321] px-3 py-2 text-xs text-white outline-none focus:border-gold"/><button disabled={pending} className="rounded-xl border border-[#464641] px-3 py-2 text-xs font-semibold text-[#d5d5ce]">Save</button></form></div>}
  </article>;
}

function CreateDutyForm({ data, organizationId, onDone }: { data: ScheduleWorkspaceData; organizationId: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <form className="grid gap-4 rounded-2xl border border-[#40403c] bg-[#1d1d1b] p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { try { setError(null); await createDuty(organizationId, { title: form.get("title"), description: form.get("description"), startsAt: new Date(String(form.get("startsAt"))).toISOString(), endsAt: new Date(String(form.get("endsAt"))).toISOString(), locationId: form.get("locationId") || undefined, departmentId: form.get("departmentId") || undefined, supervisorMembershipId: form.get("supervisorId") || undefined, assigneeIds: form.getAll("assignees") }); onDone(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create duty."); } }); }}>
    <Field label="Duty title"><input name="title" required className="input" /></Field><Field label="Description"><input name="description" className="input" /></Field><Field label="Starts"><input name="startsAt" type="datetime-local" required className="input" /></Field><Field label="Ends"><input name="endsAt" type="datetime-local" required className="input" /></Field>
    <Field label="Location"><select name="locationId" className="input"><option value="">Unassigned</option>{data.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Department"><select name="departmentId" className="input"><option value="">Unassigned</option>{data.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    <Field label="Supervisor"><select name="supervisorId" className="input"><option value="">Unassigned</option>{data.staff.map((item) => <option key={item.membershipId} value={item.membershipId}>{item.name}</option>)}</select></Field><Field label="Assign staff"><select name="assignees" multiple required className="input min-h-28">{data.staff.map((item) => <option key={item.membershipId} value={item.membershipId}>{item.name} {item.email ? `· ${item.email}` : ""}</option>)}</select></Field>
    {error && <p className="sm:col-span-2 text-xs text-sunset">{error}</p>}<div className="sm:col-span-2 flex justify-end"><button disabled={pending} className="rounded-xl bg-sunset px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60">{pending ? "Creating…" : "Create and assign"}</button></div>
  </form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-[#85857f]">{label}</span>{children}</label>; }
