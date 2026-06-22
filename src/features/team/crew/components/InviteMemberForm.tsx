"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { Role } from "../crew-service";
import { inviteTeamMember } from "../crew-actions";

export function InviteMemberForm({
  roles,
  organizationId,
}: {
  roles: Role[];
  organizationId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await inviteTeamMember(organizationId, { email, roleId });
      setMessage(`Invitation sent to ${email}`);
      setEmail("");
      setRoleId("");
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 2000);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to send invitation",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f0674e]"
        >
          <Icon name="plus" className="h-4 w-4" />
          Invite team member
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#b7b7b0]">
              Email address
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.com"
              className="mt-2 w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white placeholder:text-[#62625d] focus:border-victoria focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#b7b7b0]">
              Role
            </label>
            <select
              required
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white focus:border-victoria focus:outline-none"
            >
              <option value="">Choose a role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} – {role.description}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-savannah/30 bg-savannah/10 px-4 py-3 text-xs text-[#84d4b0]">
              {message}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-sunset px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#f0674e] disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send invitation"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-2.5 text-xs font-semibold text-[#d6d6cf] transition hover:bg-[#30302e]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
