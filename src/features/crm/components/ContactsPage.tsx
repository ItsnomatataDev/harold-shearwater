"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { addCrmContact, updateCrmContactStatus } from "../contacts-actions";
import type {
  CrmContact,
  ContactStatus,
  ContactSource,
} from "../contacts-service";

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

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function AddContactModal({
  organizationId,
  onClose,
}: {
  organizationId: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    nationality: "",
    source: "" as ContactSource | "",
    sourceDetail: "",
    status: "lead" as ContactStatus,
    notes: "",
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addCrmContact(organizationId, {
          ...form,
          source: form.source || undefined,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add contact.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#343431] bg-[#1a1a18] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#343431] px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Add Contact</h2>
          <button onClick={onClose} className="text-[#666] hover:text-white">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                First Name *
              </label>
              <input
                className="input w-full"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Jane"
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
                placeholder="Smith"
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
                placeholder="jane@example.com"
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
                placeholder="+263 77 123 4567"
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
                placeholder="South African"
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
                placeholder="e.g. agent name"
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
              placeholder="Any relevant notes about this contact…"
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
              {pending ? "Saving…" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ContactsPage({
  organizationId,
  initialContacts,
}: {
  organizationId: string;
  initialContacts: CrmContact[];
}) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">(
    "all",
  );
  const [showAdd, setShowAdd] = useState(false);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter((c) => {
      const matchesSearch =
        !q ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q);
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contacts, search, statusFilter]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: contacts.length };
    for (const s of STATUSES) {
      result[s] = contacts.filter((c) => c.status === s).length;
    }
    return result;
  }, [contacts]);

  function handleStatusChange(contactId: string, status: ContactStatus) {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, status } : c)),
    );
    startTransition(async () => {
      await updateCrmContactStatus(organizationId, contactId, status);
    });
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555]"
          />
          <input
            className="input w-full pl-9"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-victoria px-4 py-2 text-xs font-semibold text-white"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Add Contact
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#2e2e2b] bg-[#181816] p-1">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition ${
              statusFilter === s
                ? "bg-[#2e2e2b] text-white"
                : "text-[#666] hover:text-[#aaa]"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
            <span className="rounded-full bg-[#333] px-1.5 py-0.5 text-[9px] text-[#888]">
              {counts[s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-[#2e2e2b] bg-[#181816]">
          <Icon name="users" className="h-8 w-8 text-[#444]" />
          <p className="text-sm font-semibold text-[#555]">
            {search || statusFilter !== "all"
              ? "No contacts match your filter"
              : "No contacts yet"}
          </p>
          {!search && statusFilter === "all" && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs font-semibold text-victoria hover:underline"
            >
              Add your first contact
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#2e2e2b]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2e2e2b] bg-[#181816]">
                <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555]">
                  Contact
                </th>
                <th className="hidden px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555] sm:table-cell">
                  Email / Phone
                </th>
                <th className="hidden px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555] md:table-cell">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-[9px] font-semibold uppercase tracking-wider text-[#555]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232320] bg-[#1a1a18]">
              {filtered.map((contact) => (
                <tr key={contact.id} className="group hover:bg-[#1e1e1c]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/team/crm/${contact.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2e2e2b] text-[10px] font-bold text-[#888]">
                        {initials(contact.firstName, contact.lastName)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white group-hover:text-victoria">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.nationality && (
                          <p className="text-[10px] text-[#555]">
                            {contact.nationality}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <p className="text-xs text-[#aaa]">
                      {contact.email ?? "—"}
                    </p>
                    <p className="text-[10px] text-[#555]">
                      {contact.phone ?? ""}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <p className="text-xs text-[#777]">
                      {contact.source ? SOURCE_LABELS[contact.source] : "—"}
                    </p>
                    {contact.sourceDetail && (
                      <p className="text-[10px] text-[#555]">
                        {contact.sourceDetail}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={contact.status}
                      onChange={(e) =>
                        handleStatusChange(
                          contact.id,
                          e.target.value as ContactStatus,
                        )
                      }
                      className={`rounded-full border-0 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider outline-none ${STATUS_STYLES[contact.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddContactModal
          organizationId={organizationId}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
