"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { PendingInvitation, Role } from "../crew-service";
import { inviteTeamMember, revokeTeamInvitation } from "../crew-actions";

export function InviteMemberForm({
  roles,
  organizationId,
  canManageMembers,
  pendingInvitations,
}: {
  roles: Role[];
  organizationId: string;
  canManageMembers: boolean;
  pendingInvitations: PendingInvitation[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptanceUrl, setAcceptanceUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await inviteTeamMember(organizationId, { email, roleId });
      setMessage(result.deliveryMessage);
      setAcceptanceUrl(result.acceptanceUrl);
      setEmail("");
      setRoleId("");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to send invitation",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
    <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-6">
      {!canManageMembers ? (
        <div className="rounded-xl border border-[#343431] bg-[#232321] px-4 py-3 text-xs text-[#8a8a84]">
          Only admins can invite team members.
        </div>
      ) : !open ? (
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
          {acceptanceUrl && <div className="rounded-xl border border-victoria/30 bg-victoria/5 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-victoria">Secure acceptance link</p><p className="mt-2 text-[10px] leading-5 text-[#8db7c6]">The invited person must open this while signed in with the invited email. New users should normally use the Supabase invitation email first.</p><p className="mt-2 break-all text-[10px] leading-5 text-[#9bc9da]">{acceptanceUrl}</p><button type="button" onClick={() => navigator.clipboard.writeText(acceptanceUrl)} className="mt-2 rounded-lg border border-victoria/30 px-3 py-1.5 text-[10px] font-semibold text-victoria">Copy link</button></div>}
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
    {pendingInvitations.length > 0 && <div className="overflow-hidden rounded-2xl border border-[#343431] bg-[#1d1d1b]"><div className="border-b border-[#343431] px-5 py-4"><h2 className="text-base font-semibold text-white">Pending invitations ({pendingInvitations.length})</h2></div><div className="divide-y divide-[#30302d]">{pendingInvitations.map((invitation) => <div key={invitation.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-[#e1e1db]">{invitation.email}</p><p className="mt-1 text-xs text-[#777]">{invitation.roleName} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div>{canManageMembers && <button disabled={loading} onClick={async () => { setLoading(true); try { await revokeTeamInvitation(organizationId, { invitationId: invitation.id }); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to revoke invitation."); } finally { setLoading(false); } }} className="rounded-lg border border-sunset/30 px-3 py-2 text-xs font-semibold text-sunset">Revoke</button>}</div>)}</div></div>}
    </div>
  );
}
