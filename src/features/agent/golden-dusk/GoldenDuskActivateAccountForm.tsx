"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  activateGoldenDuskAgentAccount,
  validateGoldenDuskActivationToken,
} from "@/features/agent/golden-dusk/golden-dusk-public-auth-actions";

export function GoldenDuskActivateAccountForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams?.get("token") ?? "";
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [valid, setValid] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!tokenFromUrl) return;
    startTransition(async () => {
      try {
        await validateGoldenDuskActivationToken(tokenFromUrl);
        setValid(true);
      } catch (cause) {
        setValid(false);
        setError(
          cause instanceof Error ? cause.message : "This activation link is invalid.",
        );
      }
    });
  }, [tokenFromUrl]);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <header className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          GoldenDusk
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Activate account</h1>
        <p className="mt-1 text-sm text-[#666]">
          After Shearwater approves your GoldenDusk account, open the activation
          link from your email. Paste the token from that link here — not your
          email address.
        </p>
      </header>

      {done ? (
        <div className="rounded-2xl border border-emerald-700/30 bg-emerald-900/15 p-5 text-center">
          <p className="text-sm text-emerald-100">
            Account activated. Connect GoldenDusk in Harold agent settings to start
            quoting activities.
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
                await activateGoldenDuskAgentAccount({
                  token,
                  password,
                  confirmPassword,
                });
                setDone(true);
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Unable to activate account.",
                );
              }
            });
          }}
        >
          {valid === false && (
            <p className="rounded-xl bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
              {error ?? "This activation link is invalid or has expired."}
            </p>
          )}
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Activation token
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="input mt-2 w-full font-mono text-xs"
              placeholder="From ?token=… in your activation email"
              required
            />
          </label>
          <p className="text-[11px] leading-4 text-[#666]">
            If you only submitted Request access and have not been approved yet,
            wait for Shearwater — or ask Franklin for a demo login and use Sign
            in under Agent Settings instead.
          </p>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input mt-2 w-full"
              minLength={8}
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
              minLength={8}
              required
            />
          </label>
          {error && valid !== false && (
            <p className="rounded-xl bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || valid === false}
            className="btn-primary w-full text-xs disabled:opacity-50"
          >
            {pending ? "Activating…" : "Activate account"}
          </button>
        </form>
      )}
    </div>
  );
}
