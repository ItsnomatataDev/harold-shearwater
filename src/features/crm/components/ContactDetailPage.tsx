"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import {
  updateCrmContact,
  updateCrmContactStatus,
  deleteCrmContact,
  addCrmActivity,
} from "../contacts-actions";
import type {
  CrmContact,
  ContactStatus,
  ContactSource,
  CrmActivity,
  ActivityType,
} from "../contacts-service";
import type { CrmDeal } from "../deals-service";
import { ContactDeals } from "./ContactDeals";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: "Lead",
  prospect: "Prospect",
  active: "Active",
  past_guest: "Past Guest",
  vip: "VIP",
  lost: "Lost",
};
const STATUS_STYLES: Record<ContactStatus, string> = {
  lead: "bg-[#2a2a27] text-[#aaa]",
  prospect: "bg-victoria/10 text-victoria",
  active: "bg-savannah/10 text-savannah",
  past_guest: "bg-gold/10 text-gold",
  vip: "bg-sunset/10 text-sunset",
  lost: "bg-[#2a2a27] text-[#666]",
};
const SOURCE_LABELS: Record<ContactSource, string> = {
  direct: "Direct",
  agent: "Agent",
  harold_chat: "Harold Chat",
  referral: "Referral",
  walk_in: "Walk-in",
  website: "Website",
  other: "Other",
};
const STATUSES: ContactStatus[] = [
  "lead",
  "prospect",
  "active",
  "past_guest",
  "vip",
  "lost",
];
const SOURCES: ContactSource[] = [
  "direct",
  "agent",
  "harold_chat",
  "referral",
  "walk_in",
  "website",
  "other",
];
const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string }[] = [
  { value: "note", label: "Note", icon: "document" },
  { value: "call", label: "Call", icon: "phone" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "meeting", label: "Meeting", icon: "calendar" },
  { value: "task", label: "Task", icon: "check" },
  { value: "harold_chat", label: "Harold Chat", icon: "harold" },
];

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Edit Contact Modal ───────────────────────────────────────────────────────

function EditContactModal({
  contact,
  organizationId,
  onClose,
}: {
  contact: CrmContact;
  organizationId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    nationality: contact.nationality ?? "",
    source: (contact.source ?? "") as ContactSource | "",
    sourceDetail: contact.sourceDetail ?? "",
    status: contact.status,
    notes: contact.notes ?? "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await updateCrmContact(organizationId, contact.id, {
          ...form,
          source: form.source || undefined,
        });
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save changes.",
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#343431] bg-[#1a1a18] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#343431] px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Edit Contact</h2>
          <button onClick={onClose} className="text-[#666] hover:text-white">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={submit}
          className="max-h-[80vh] space-y-4 overflow-y-auto p-6"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                First Name *
              </label>
              <input
                className="input w-full"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Last Name
              </label>
              <input
                className="input w-full"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Email
              </label>
              <input
                type="email"
                className="input w-full"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Phone
              </label>
              <input
                className="input w-full"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Nationality
              </label>
              <input
                className="input w-full"
                value={form.nationality}
                onChange={(e) => set("nationality", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Status
              </label>
              <select
                className="input w-full"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Source
              </label>
              <select
                className="input w-full"
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
              >
                <option value="">— Select —</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Source Detail
              </label>
              <input
                className="input w-full"
                value={form.sourceDetail}
                onChange={(e) => set("sourceDetail", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Notes
            </label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-sunset/10 px-3 py-2 text-xs text-[#f18a77]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#3b3b38] px-4 py-2 text-xs text-[#999] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-victoria px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Log Activity Modal ───────────────────────────────────────────────────────

function LogActivityModal({
  contact,
  organizationId,
  onClose,
}: {
  contact: CrmContact;
  organizationId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ActivityType>("note");
  const [body, setBody] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addCrmActivity(organizationId, contact.id, { type, body });
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to log activity.",
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#343431] bg-[#1a1a18] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#343431] px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Log Activity</h2>
          <button onClick={onClose} className="text-[#666] hover:text-white">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Activity Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-[10px] font-semibold uppercase tracking-wider transition ${
                    type === t.value
                      ? "border-victoria bg-victoria/10 text-victoria"
                      : "border-[#2e2e2b] text-[#666] hover:text-[#aaa]"
                  }`}
                >
                  <Icon name={t.icon as never} className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Details *
            </label>
            <textarea
              className="input w-full resize-none"
              rows={4}
              placeholder={`Describe the ${type}…`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="rounded-lg bg-sunset/10 px-3 py-2 text-xs text-[#f18a77]">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#3b3b38] px-4 py-2 text-xs text-[#999] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !body.trim()}
              className="rounded-lg bg-victoria px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {pending ? "Saving…" : "Log Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Activity Icon ────────────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  note: "bg-[#2a2a27] text-[#aaa]",
  call: "bg-savannah/10 text-savannah",
  email: "bg-victoria/10 text-victoria",
  meeting: "bg-gold/10 text-gold",
  task: "bg-sunset/10 text-sunset",
  harold_chat: "bg-[#3a2a3a] text-[#c084fc]",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContactDetailPage({
  organizationId,
  contact: initialContact,
  activities: initialActivities,
  deals: initialDeals,
  contacts,
}: {
  organizationId: string;
  contact: CrmContact;
  activities: CrmActivity[];
  deals: CrmDeal[];
  contacts: CrmContact[];
}) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [activities] = useState(initialActivities);
  const [showEdit, setShowEdit] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [, startStatus] = useTransition();

  function handleStatusChange(status: ContactStatus) {
    setContact((c) => ({ ...c, status }));
    startStatus(async () => {
      await updateCrmContactStatus(organizationId, contact.id, status);
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete ${contact.firstName} ${contact.lastName}? This cannot be undone.`,
      )
    )
      return;
    startDelete(async () => {
      await deleteCrmContact(organizationId, contact.id);
      router.push("/team/crm");
    });
  }

  function handleEditClose() {
    setShowEdit(false);
    // Optimistic: page will revalidate via server action
  }

  function handleLogClose() {
    setShowLog(false);
  }

  return (
    <div className="space-y-6">
      {/* Back breadcrumb */}
      <Link
        href="/team/crm"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666] hover:text-white"
      >
        <Icon name="chevronLeft" className="h-3 w-3" />
        Back to Contacts
      </Link>

      {/* Profile card */}
      <div className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#2e2e2b] text-xl font-bold text-[#888]">
              {initials(contact.firstName, contact.lastName)}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                {contact.firstName} {contact.lastName}
              </h1>
              {contact.nationality && (
                <p className="mt-0.5 text-sm text-[#666]">
                  {contact.nationality}
                </p>
              )}
              <div className="mt-2">
                <select
                  value={contact.status}
                  onChange={(e) =>
                    handleStatusChange(e.target.value as ContactStatus)
                  }
                  className={`rounded-full border-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider outline-none ${STATUS_STYLES[contact.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLog(true)}
              className="flex items-center gap-2 rounded-xl border border-[#343431] px-4 py-2 text-xs font-semibold text-[#aaa] hover:text-white"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Log Activity
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 rounded-xl bg-victoria px-4 py-2 text-xs font-semibold text-white"
            >
              <Icon name="edit" className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl border border-[#3b2020] px-3 py-2 text-xs text-[#c05050] hover:bg-[#3b2020] disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
          </div>
        </div>

        {/* Details grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#2e2e2b] pt-6 sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555]">
              Email
            </p>
            <p className="mt-1 text-xs text-[#ccc]">{contact.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555]">
              Phone
            </p>
            <p className="mt-1 text-xs text-[#ccc]">{contact.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555]">
              Source
            </p>
            <p className="mt-1 text-xs text-[#ccc]">
              {contact.source ? SOURCE_LABELS[contact.source] : "—"}
              {contact.sourceDetail && (
                <span className="ml-1 text-[#555]">
                  ({contact.sourceDetail})
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555]">
              Added
            </p>
            <p className="mt-1 text-xs text-[#ccc]">
              {formatDate(contact.createdAt)}
            </p>
          </div>
          {contact.notes && (
            <div className="col-span-full">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555]">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#ccc]">
                {contact.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Deals */}
      <ContactDeals
        organizationId={organizationId}
        contact={contact}
        initialDeals={initialDeals}
        contacts={contacts}
      />

      {/* Activity timeline */}
      <div className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18]">
        <div className="flex items-center justify-between border-b border-[#2e2e2b] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Activity</h2>
          <button
            onClick={() => setShowLog(true)}
            className="text-xs font-semibold text-victoria hover:underline"
          >
            + Log
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Icon name="document" className="h-8 w-8 text-[#333]" />
            <p className="text-sm font-semibold text-[#555]">No activity yet</p>
            <button
              onClick={() => setShowLog(true)}
              className="text-xs font-semibold text-victoria hover:underline"
            >
              Log the first activity
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-[#232320]">
            {activities.map((activity) => {
              const typeInfo = ACTIVITY_TYPES.find(
                (t) => t.value === activity.type,
              );
              return (
                <li key={activity.id} className="flex gap-4 px-5 py-4">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ACTIVITY_COLORS[activity.type]}`}
                  >
                    <Icon
                      name={(typeInfo?.icon ?? "document") as never}
                      className="h-3.5 w-3.5"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#666]">
                        {typeInfo?.label ?? activity.type}
                      </span>
                      {activity.memberName && (
                        <span className="text-[10px] text-[#555]">
                          by {activity.memberName}
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-[#444]">
                        {formatDateTime(activity.occurredAt)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#bbb]">
                      {activity.body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showEdit && (
        <EditContactModal
          contact={contact}
          organizationId={organizationId}
          onClose={handleEditClose}
        />
      )}
      {showLog && (
        <LogActivityModal
          contact={contact}
          organizationId={organizationId}
          onClose={handleLogClose}
        />
      )}
    </div>
  );
}
