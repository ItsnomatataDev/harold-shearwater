"use client";

import { useState, useTransition, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import {
  acceptTeamInvitation,
  acceptTeamInvitationById,
  provisionInvitedTeamAccount,
} from "../invitation-actions";
import type { TeamInvitationDetails } from "../services/invitation-service";

export function TeamInvitationAcceptPanel({
  token,
  invitation,
  signedInEmail,
}: {
  token: string | null;
  invitation: TeamInvitationDetails;
  signedInEmail: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const emailMatches =
    signedInEmail?.toLowerCase() === invitation.email.toLowerCase();

  async function acceptInvitation() {
    if (token) {
      await acceptTeamInvitation(token);
    } else {
      await acceptTeamInvitationById(invitation.invitationId);
    }
  }

  async function handleCreateAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await provisionInvitedTeamAccount({
          token,
          invitationId: invitation.invitationId,
          password,
        });

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation.email,
          password,
        });

        if (signInError) {
          setError(
            result.requiresSignIn
              ? "You already have an account for this email. Enter your existing password to continue."
              : signInError.message,
          );
          return;
        }

        await acceptInvitation();
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to create your account.",
        );
      }
    });
  }

  async function handleCompleteSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });
        if (updateError) throw updateError;
        await acceptInvitation();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to complete setup.",
        );
      }
    });
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-[#343431] bg-[#1d1d1b] p-7 shadow-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#151513]">
          <Image
            src="/swicon.png"
            alt="Shearwater"
            width={44}
            height={44}
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-sunset">
            Team Access invitation
          </p>
          <p className="text-sm font-semibold text-white">
            {invitation.organizationName}
          </p>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-white">
        {signedInEmail && emailMatches
          ? "Complete your Team Access setup"
          : "Create your Team Access account"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[#999]">
        You were invited as{" "}
        <strong className="text-[#ddd]">{invitation.roleName}</strong>. Use the
        invited email below — it cannot be changed.
      </p>

      <LockedEmailField email={invitation.email} />

      {signedInEmail && !emailMatches && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs leading-5 text-[#f18a77]">
            You are signed in as <strong>{signedInEmail}</strong>, but this
            invitation was sent to <strong>{invitation.email}</strong>. Sign out
            and continue with the invited email.
          </div>
          <SignOutButton />
        </div>
      )}

      {signedInEmail && emailMatches ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-savannah/30 bg-savannah/5 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-savannah">
                Signed in as
              </p>
              <p className="truncate text-xs font-semibold text-[#d6d6cf]">
                {signedInEmail}
              </p>
            </div>
            <SignOutButton compact />
          </div>
          <p className="text-xs leading-5 text-[#8d8d87]">
            Set a secure password for your account, then join Team Access. This
            is required even if you opened the link from your email.
          </p>
          <form onSubmit={handleCompleteSetup} className="space-y-4">
            <PasswordInput label="Create password" name="password" />
            <PasswordInput label="Confirm password" name="confirmPassword" />
            {error && <Alert tone="error">{error}</Alert>}
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Joining team…" : "Set password & join team"}
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : !signedInEmail ? (
        <div className="mt-6">
          <div className="mb-5 rounded-xl border border-[#343431] bg-[#151513] px-4 py-3 text-[11px] leading-5 text-[#8d8d87]">
            <p className="font-semibold text-[#d0d0c9]">Set up your account</p>
            <p className="mt-1">
              Create a password for{" "}
              <strong className="text-[#c8c8c2]">{invitation.email}</strong> to
              finish joining Team Access. You will be signed in automatically.
            </p>
          </div>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <PasswordInput label="Create password" name="password" />
            <PasswordInput label="Confirm password" name="confirmPassword" />
            {error && <Alert tone="error">{error}</Alert>}
            {message && <Alert tone="success">{message}</Alert>}
            <button
              type="submit"
              disabled={pending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Creating account…" : "Create account & join team"}
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </form>
        </div>
      ) : null}

      <p className="mt-6 text-center text-[10px] text-[#666660]">
        Invitation expires at{" "}
        {new Date(invitation.expiresAt).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

function LockedEmailField({ email }: { email: string }) {
  return (
    <label className="mt-5 block">
      <span className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">
        Invited email
      </span>
      <input
        type="email"
        value={email}
        readOnly
        className="w-full cursor-not-allowed rounded-xl border border-[#3a3a36] bg-[#1a1a18] px-4 py-3 text-sm text-[#c8c8c2] focus:outline-none"
      />
    </label>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]"
          : "rounded-xl border border-savannah/30 bg-savannah/10 px-4 py-3 text-xs text-[#84d4b0]"
      }
    >
      {children}
    </p>
  );
}
