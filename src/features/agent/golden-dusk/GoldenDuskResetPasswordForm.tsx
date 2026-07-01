"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { resetGoldenDuskPassword } from "@/features/agent/golden-dusk/golden-dusk-public-auth-actions";

export function GoldenDuskResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams?.get("token") ?? "";
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          GoldenDusk
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Reset password</h1>
        <p className="mt-1 text-sm text-[#666]">
          Use the reset token from your GoldenDusk email link — not your email
          address.
        </p>
      </header>

      {done ? (
        <div className="rounded-2xl border border-emerald-700/30 bg-emerald-900/15 p-5 text-center">
          <p className="text-sm text-emerald-100">
            Password updated. You can now sign in from Harold agent settings.
          </p>
          <Link href="/agent/settings" className="btn-primary mt-4 inline-block text-xs">
            Go to agent settings
          </Link>
        </div>
      ) : (
        <form
          className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              try {
                await resetGoldenDuskPassword({ token, password, confirmPassword });
                setDone(true);
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "Unable to reset password.",
                );
              }
            });
          }}
        >
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Reset token
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="input mt-2 w-full font-mono text-xs"
              placeholder="From ?token=… in your reset email"
              required
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input mt-2 w-full"
              minLength={6}
              required
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="input mt-2 w-full"
              minLength={6}
              required
            />
          </label>
          {error && (
            <p className="rounded-xl bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
              {error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn-primary w-full text-xs">
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
