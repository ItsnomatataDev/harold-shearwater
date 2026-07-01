"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import {
  describeAgencyCredit,
} from "@/features/integrations/golden-dusk/agent-finance-display";
import type { GoldenDuskConnectionSummary } from "@/features/integrations/golden-dusk/agent-auth-service";
import type { AgencyCreditLine } from "@/features/integrations/golden-dusk/agent-credit";
import { GOLDEN_DUSK_MFA_FACTOR_LABELS } from "@/features/integrations/golden-dusk/agent-auth-utils";
import type { GoldenDuskLoginNextStep } from "@/features/integrations/golden-dusk/agent-auth-types";
import {
  beginGoldenDuskMfaSetup,
  confirmGoldenDuskMfaSetup,
  disconnectGoldenDuskAgentAction,
  refreshGoldenDuskAgentProfileAction,
  sendGoldenDuskAgentEmailOtp,
  startGoldenDuskAgentLogin,
  verifyGoldenDuskAgentMfa,
} from "./golden-dusk-auth-actions";
import {
  requestGoldenDuskAgentAccess,
  requestGoldenDuskPasswordReset,
} from "./golden-dusk-public-auth-actions";

type PanelTab = "sign_in" | "forgot" | "request_access";

type AuthStep =
  | { kind: "credentials" }
  | {
      kind: "mfa_verify" | "mfa_setup";
      challengeId: string;
      email: string;
      factors: string[];
      setupUri?: string | null;
      setupSecret?: string | null;
    };

export function GoldenDuskConnectPanel({
  connection,
  agencyCredit = null,
}: {
  connection: GoldenDuskConnectionSummary;
  agencyCredit?: AgencyCreditLine | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<PanelTab>("sign_in");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(connection.connected);
  const [summary, setSummary] = useState(connection);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authStep, setAuthStep] = useState<AuthStep>({ kind: "credentials" });
  const [factor, setFactor] = useState("totp");
  const [code, setCode] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [accessForm, setAccessForm] = useState({
    agencyId: "",
    agencyName: "",
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    message: "",
  });

  useEffect(() => {
    setConnected(connection.connected);
    setSummary(connection);
  }, [connection]);

  function run(work: () => Promise<void>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await work();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to update GoldenDusk connection.",
        );
      }
    });
  }

  function handleConnected(auth: {
    email: string | null;
    agencyName: string | null;
    recoveryCodes?: string[];
  }) {
    setConnected(true);
    setSummary((current) => ({
      ...current,
      connected: true,
      connectedEmail: auth.email,
      agencyName: auth.agencyName,
    }));
    setAuthStep({ kind: "credentials" });
    setRecoveryCodes(auth.recoveryCodes ?? []);
    setCode("");
    setPassword("");
    router.refresh();
  }

  if (connected) {
    const creditLine =
      agencyCredit ?? summary.liveProfile?.credit?.lines?.[0] ?? null;
    const creditCurrency =
      agencyCredit?.currencyCode ??
      creditLine?.currencyCode ??
      summary.liveProfile?.currencyCode ??
      "USD";
    const creditAvailable =
      agencyCredit?.available ?? creditLine?.available ?? null;
    const creditOutstanding =
      agencyCredit?.outstanding ?? creditLine?.outstanding ?? null;

    return (
      <section className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-6 space-y-4">
        <div className="border-b border-[#2e2e2b] pb-4">
          <h2 className="text-sm font-semibold text-white">Booking session</h2>
          <p className="mt-0.5 text-xs text-[#666]">
            Connected automatically when you sign in as a travel agent. You do
            not need to disconnect after a normal sign-in.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-700/30 bg-emerald-900/15 px-4 py-3">
          <p className="text-xs font-semibold text-emerald-300">Active</p>
          <p className="mt-1 text-sm text-emerald-100/80">
            {summary.liveProfile?.fullName ??
              summary.connectedEmail ??
              "Agent session connected"}
            {summary.agencyName ? ` · ${summary.agencyName}` : ""}
          </p>
          {summary.consultantName && (
            <p className="mt-1 text-xs text-emerald-200/70">
              Consultant: {summary.consultantName}
            </p>
          )}
        </div>

        {creditAvailable != null && (
          <div className="rounded-xl border border-[#2f2f2b] bg-[#141412] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Agency credit
              {agencyCredit?.source === "finance-balance" ? (
                <span className="ml-2 text-[#666]">· SWAIBMS balance</span>
              ) : null}
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {agencyCredit
                ? describeAgencyCredit(agencyCredit).availableLabel
                : `${creditCurrency} ${creditAvailable.toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} available`}
            </p>
            {creditOutstanding != null && creditOutstanding > 0 ? (
              <p className="mt-1 text-xs text-[#777]">
                Outstanding {creditCurrency}{" "}
                {creditOutstanding.toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            ) : null}
            <Link href="/agent/finance" className="mt-3 inline-block text-xs text-gold hover:underline">
              Open agency finance
            </Link>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href="/agent/bookings" className="btn-primary text-xs">
            View bookings
          </Link>
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="btn-ghost text-xs text-[#888] hover:text-white"
          >
            {showAdvanced ? "Hide advanced" : "Advanced options"}
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-3 border-t border-[#2e2e2b] pt-4">
            <p className="text-xs text-[#777]">
              Only disconnect if you need to clear a broken booking session or
              switch SWAIBMS accounts. Normal sign-out from the sidebar is
              enough for day-to-day use.
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await refreshGoldenDuskAgentProfileAction();
                  router.refresh();
                })
              }
              className="btn-ghost text-xs"
            >
              Refresh booking profile
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await disconnectGoldenDuskAgentAction();
                  setConnected(false);
                  setSummary({
                    connected: false,
                    connectedEmail: null,
                    agencyName: null,
                    consultantName: null,
                    tokenExpiresAt: null,
                    liveProfile: null,
                  });
                  setRecoveryCodes([]);
                  router.refresh();
                })
              }
              className="btn-ghost text-xs text-[#888] hover:text-white"
            >
              Disconnect booking session
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-6 space-y-4">
      <div className="border-b border-[#2e2e2b] pb-4">
        <h2 className="text-sm font-semibold text-white">
          Booking session recovery
        </h2>
        <p className="mt-0.5 text-xs text-[#666]">
          Travel agents normally connect during sign-in. Use this panel only if
          your booking session expired, you need a password reset, or you are
          requesting new agent access.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["sign_in", "Sign in"],
            ["forgot", "Forgot password"],
            ["request_access", "Request access"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setTab(value);
              setError(null);
              setMessage(null);
              setAuthStep({ kind: "credentials" });
            }}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              tab === value
                ? "bg-gold text-black"
                : "border border-[#343431] text-[#85857d] hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sign_in" && authStep.kind === "credentials" && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const result = await startGoldenDuskAgentLogin({ email, password });
              const nextStep = result.nextStep as GoldenDuskLoginNextStep;
              if (nextStep === "mfa_setup") {
                const setup = await beginGoldenDuskMfaSetup(result.challengeId);
                setAuthStep({
                  kind: "mfa_setup",
                  challengeId: result.challengeId,
                  email: result.email,
                  factors: result.factors,
                  setupUri: setup.otpAuthUri,
                  setupSecret: setup.secret,
                });
                setMessage(
                  "Scan the authenticator setup code, then enter your first 6-digit code.",
                );
              } else {
                setAuthStep({
                  kind: "mfa_verify",
                  challengeId: result.challengeId,
                  email: result.email,
                  factors: result.factors.length ? result.factors : ["totp"],
                });
                setFactor(result.factors[0] ?? "totp");
                setMessage(
                  result.message ??
                    "Enter the verification code from your authenticator or email.",
                );
              }
              setPassword("");
            });
          }}
        >
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            GoldenDusk email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input mt-2 w-full"
              required
              autoComplete="username"
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input mt-2 w-full"
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={pending} className="btn-primary text-xs">
            {pending ? "Signing in…" : "Continue"}
          </button>
        </form>
      )}

      {tab === "sign_in" && authStep.kind !== "credentials" && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const result =
                authStep.kind === "mfa_setup"
                  ? await confirmGoldenDuskMfaSetup({
                      challengeId: authStep.challengeId,
                      code,
                    })
                  : await verifyGoldenDuskAgentMfa({
                      challengeId: authStep.challengeId,
                      factor,
                      code,
                    });
              handleConnected(result);
              setMessage("GoldenDusk connected successfully.");
            });
          }}
        >
          <p className="text-xs text-[#888]">
            {authStep.kind === "mfa_setup"
              ? "Set up MFA for"
              : "Verify sign-in for"}{" "}
            <span className="text-white">{authStep.email}</span>
          </p>

          {authStep.kind === "mfa_setup" && authStep.setupUri && (
            <div className="rounded-xl border border-[#2f2f2b] bg-[#141412] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Authenticator setup
              </p>
              <a
                href={authStep.setupUri}
                className="mt-2 inline-flex text-xs text-savannah hover:underline"
              >
                Open in authenticator app
              </a>
              {authStep.setupSecret && (
                <p className="mt-2 break-all font-mono text-[11px] text-[#aaa]">
                  Secret: {authStep.setupSecret}
                </p>
              )}
            </div>
          )}

          {authStep.kind === "mfa_verify" && authStep.factors.length > 1 && (
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Verification method
              <select
                value={factor}
                onChange={(event) => setFactor(event.target.value)}
                className="input mt-2 w-full"
              >
                {authStep.factors.map((item) => (
                  <option key={item} value={item}>
                    {GOLDEN_DUSK_MFA_FACTOR_LABELS[item] ?? item}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Verification code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="input mt-2 w-full"
              placeholder="6-digit code"
              required
              autoComplete="one-time-code"
            />
          </label>

          {authStep.kind === "mfa_verify" && factor === "email" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await sendGoldenDuskAgentEmailOtp(authStep.challengeId);
                  setMessage("A new email code has been sent.");
                })
              }
              className="btn-ghost text-xs"
            >
              Resend email code
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-xs">
              {pending ? "Verifying…" : "Connect GoldenDusk"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setAuthStep({ kind: "credentials" });
                setCode("");
                setError(null);
              }}
              className="btn-ghost text-xs"
            >
              Start over
            </button>
          </div>
        </form>
      )}

      {tab === "forgot" && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const result = await requestGoldenDuskPasswordReset({
                email: forgotEmail,
              });
              if (result) setMessage(result.message);
            });
          }}
        >
          <p className="text-xs text-[#888]">
            GoldenDusk will email a reset link. Use that link on the reset page
            to choose a new password.
          </p>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            GoldenDusk email
            <input
              type="email"
              value={forgotEmail}
              onChange={(event) => setForgotEmail(event.target.value)}
              className="input mt-2 w-full"
              required
            />
          </label>
          <button type="submit" disabled={pending} className="btn-primary text-xs">
            Send reset email
          </button>
        </form>
      )}

      {tab === "request_access" && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const result = await requestGoldenDuskAgentAccess({
                agencyId: accessForm.agencyId,
                agencyName: accessForm.agencyName || undefined,
                firstName: accessForm.firstName,
                surname: accessForm.surname,
                email: accessForm.email,
                phone: accessForm.phone || undefined,
                message: accessForm.message || undefined,
              });
              if (result) setMessage(result.message);
            });
          }}
        >
          <p className="text-xs text-[#888]">
            No GoldenDusk login yet? Submit a request — Shearwater approves new
            agent portal accounts in GoldenDusk.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              GoldenDusk agency ID
              <input
                value={accessForm.agencyId}
                onChange={(event) =>
                  setAccessForm((form) => ({ ...form, agencyId: event.target.value }))
                }
                className="input mt-2 w-full"
                required
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Agency name
              <input
                value={accessForm.agencyName}
                onChange={(event) =>
                  setAccessForm((form) => ({ ...form, agencyName: event.target.value }))
                }
                className="input mt-2 w-full"
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              First name
              <input
                value={accessForm.firstName}
                onChange={(event) =>
                  setAccessForm((form) => ({ ...form, firstName: event.target.value }))
                }
                className="input mt-2 w-full"
                required
              />
            </label>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              Surname
              <input
                value={accessForm.surname}
                onChange={(event) =>
                  setAccessForm((form) => ({ ...form, surname: event.target.value }))
                }
                className="input mt-2 w-full"
                required
              />
            </label>
          </div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Email
            <input
              type="email"
              value={accessForm.email}
              onChange={(event) =>
                setAccessForm((form) => ({ ...form, email: event.target.value }))
              }
              className="input mt-2 w-full"
              required
            />
          </label>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#777]">
            Notes
            <textarea
              value={accessForm.message}
              onChange={(event) =>
                setAccessForm((form) => ({ ...form, message: event.target.value }))
              }
              rows={3}
              className="input mt-2 w-full resize-none"
              placeholder="Agency details, expected volume, etc."
            />
          </label>
          <button type="submit" disabled={pending} className="btn-primary text-xs">
            Submit access request
          </button>
        </form>
      )}

      {message && (
        <p className="rounded-xl border border-savannah/20 bg-savannah/10 px-4 py-3 text-xs text-savannah">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-sunset/20 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </p>
      )}

      <p className="text-[11px] leading-4 text-[#666]">
        Passwords go directly to GoldenDusk. Harold stores only a server-side
        session token for quotes and bookings. Reset links from email should
        open{" "}
        <Link href="/auth/golden-dusk/reset" className="text-savannah hover:underline">
          /auth/golden-dusk/reset
        </Link>
        ; activation links use{" "}
        <Link
          href="/auth/golden-dusk/activate"
          className="text-savannah hover:underline"
        >
          /auth/golden-dusk/activate
        </Link>
        .
      </p>
    </section>
  );
}
