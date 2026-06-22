"use client";

import { useState, useTransition } from "react";
import { acceptTeamInvitation } from "../invitation-actions";

export function AcceptInvitationPanel({ token, email }: { token: string; email: string }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null);
  return <div className="w-full max-w-lg rounded-3xl border border-[#343431] bg-[#1d1d1b] p-7 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[.16em] text-sunset">Team Access invitation</p><h1 className="mt-4 text-2xl font-semibold text-white">Join Shearwater Team Access</h1><p className="mt-3 text-sm leading-6 text-[#999]">You are signed in as <strong className="text-[#ddd]">{email}</strong>. Accepting will activate the organization membership and role attached to this invitation.</p>{error && <p className="mt-4 rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-sunset">{error}</p>}<button disabled={pending} onClick={() => startTransition(async () => { try { setError(null); await acceptTeamInvitation(token); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to accept invitation."); } })} className="mt-6 w-full rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending ? "Activating access…" : "Accept invitation"}</button></div>;
}
