"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";
import {
  beginAgentUnifiedLoginMfaSetupAction,
  completeAgentUnifiedLoginMfaAction,
  confirmAgentUnifiedLoginMfaSetupAction,
  sendAgentUnifiedLoginEmailOtpAction,
  startAgentUnifiedLoginAction,
} from "@/features/auth/actions/agent-unified-login-actions";
import { GOLDEN_DUSK_MFA_FACTOR_LABELS } from "@/features/integrations/golden-dusk/agent-auth-utils";
import type { GoldenDuskLoginNextStep } from "@/features/integrations/golden-dusk/agent-auth-types";

type Mode = "login" | "register" | "forgot";
type SignupRole = "customer" | "agent";
type LoginRole = "standard" | "agent";

type AgentAuthStep =
  | { kind: "credentials" }
  | {
      kind: "mfa_verify" | "mfa_setup";
      challengeId: string;
      email: string;
      factors: string[];
      setupUri?: string | null;
      setupSecret?: string | null;
    };

const SIGNUP_ROLES: Array<{
  key: SignupRole;
  label: string;
  description: string;
  accent: string;
}> = [
  {
    key: "customer",
    label: "Guest / Customer",
    description: "Bookings, trip prep, documents and Harold support.",
    accent: "bg-savannah",
  },
  {
    key: "agent",
    label: "Travel Agent",
    description: "Products, enquiries and rates after Shearwater approval.",
    accent: "bg-gold",
  },
];

const LOGIN_ROLES: Array<{
  key: LoginRole;
  label: string;
  description: string;
  accent: string;
}> = [
  {
    key: "standard",
    label: "Guest or team member",
    description: "Customer portal or internal Team Access (invite required).",
    accent: "bg-savannah",
  },
  {
    key: "agent",
    label: "Travel agent",
    description:
      "One sign-in for Shearwater and your bookings. Verification code may be required.",
    accent: "bg-gold",
  },
];

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams?.get("next") ?? "";

  const [mode, setMode] = useState<Mode>("login");
  const [signupRole, setSignupRole] = useState<SignupRole>("customer");
  const [loginRole, setLoginRole] = useState<LoginRole>("standard");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [agentAuthStep, setAgentAuthStep] = useState<AgentAuthStep>({
    kind: "credentials",
  });
  const [agentPassword, setAgentPassword] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [mfaFactor, setMfaFactor] = useState("totp");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [agentRedirectTo, setAgentRedirectTo] = useState("/agent/dashboard");

  function resetAgentFlow() {
    setAgentAuthStep({ kind: "credentials" });
    setAgentPassword("");
    setMfaCode("");
    setRecoveryCodes([]);
    setAgentRedirectTo("/agent/dashboard");
  }

  function finishAgentLogin(redirectTo: string) {
    setAgentPassword("");
    setMfaCode("");
    window.location.assign(redirectTo);
  }

  function resetMessages() {
    setError(null);
    setMessage(null);
  }

  async function handleAgentCredentialsSubmit(email: string, password: string) {
    setAgentEmail(email);
    setAgentPassword(password);

    const result = await startAgentUnifiedLoginAction({
      email,
      password,
      nextPath: nextPath.startsWith("/agent") ? nextPath : undefined,
    });

    if (result.status === "complete") {
      finishAgentLogin(result.redirectTo);
      return;
    }

    const nextStep = result.nextStep as GoldenDuskLoginNextStep;

    if (nextStep === "mfa_setup") {
      const setup = await beginAgentUnifiedLoginMfaSetupAction({
        email,
        challengeId: result.challengeId,
      });
      setAgentAuthStep({
        kind: "mfa_setup",
        challengeId: result.challengeId,
        email,
        factors: result.factors,
        setupUri: setup.otpAuthUri,
        setupSecret: setup.secret,
      });
      setMessage(
        "Scan the authenticator setup code, then enter your first 6-digit code.",
      );
      return;
    }

    setAgentAuthStep({
      kind: "mfa_verify",
      challengeId: result.challengeId,
      email,
      factors: result.factors.length ? result.factors : ["totp"],
    });
    setMfaFactor(result.factors[0] ?? "totp");
    setMessage(
      result.message ??
        "Enter the verification code from your authenticator or email.",
    );
  }

  async function handleAgentMfaSubmit() {
    if (agentAuthStep.kind === "credentials") return;

    const payload = {
      email: agentEmail,
      password: agentPassword,
      challengeId: agentAuthStep.challengeId,
      code: mfaCode,
      factor: mfaFactor,
      nextPath: nextPath.startsWith("/agent") ? nextPath : undefined,
    };

    const result =
      agentAuthStep.kind === "mfa_setup"
        ? await confirmAgentUnifiedLoginMfaSetupAction(payload)
        : await completeAgentUnifiedLoginMfaAction(payload);

    if (result.recoveryCodes.length > 0) {
      setRecoveryCodes(result.recoveryCodes);
      setAgentRedirectTo(result.redirectTo);
      setMessage("Save your recovery codes, then continue to your agent workspace.");
      return;
    }

    finishAgentLogin(result.redirectTo);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    resetMessages();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const supabase = createClient();

    try {
      if (mode === "forgot") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
          },
        );
        if (resetError) throw resetError;
        setMessage("Check your email for a secure password reset link.");
        return;
      }

      if (mode === "register") {
        const firstName = String(form.get("firstName") ?? "").trim();
        const lastName = String(form.get("lastName") ?? "").trim();
        const portalAccess = signupRole;

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath || "/auth/continue")}`,
            data: {
              first_name: firstName,
              last_name: lastName,
              portal_access: portalAccess,
            },
          },
        });
        if (signUpError) throw signUpError;
        setMessage(
          signupRole === "agent"
            ? "Account created. Confirm your email, then sign in to request Agent Access."
            : "Account created. Confirm your email, then sign in to activate Customer Access.",
        );
        return;
      }

      if (loginRole === "agent") {
        await handleAgentCredentialsSubmit(email, password);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      router.replace(
        nextPath.startsWith("/") ? nextPath : "/auth/continue",
      );
      router.refresh();
    } catch (cause) {
      const messageText =
        cause instanceof Error
          ? cause.message
          : "Authentication failed. Please try again.";
      setError(
        messageText.toLowerCase().includes("invalid login credentials")
          ? "Email or password is incorrect. Use Forgot password to reset, or confirm you are signing in (not creating a new account)."
          : messageText,
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAgentMfaFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    resetMessages();

    try {
      await handleAgentMfaSubmit();
      setMessage("Signed in successfully. Loading your agent workspace…");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const showingAgentMfa =
    mode === "login" &&
    loginRole === "agent" &&
    (agentAuthStep.kind !== "credentials" || recoveryCodes.length > 0);

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#1b1b19]">
          <Image
            src="/swicon.png"
            alt="Shearwater Victoria Falls"
            width={48}
            height={48}
            priority
            className="h-full w-full object-contain"
          />
        </div>
        <div>
          <p className="text-sm font-bold tracking-[.17em] text-white">
            SHEARWATER
          </p>
          <p className="mt-1 text-[9px] font-semibold tracking-[.2em] text-[#777771]">
            VICTORIA FALLS
          </p>
        </div>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-sunset">
        Unified access
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-.035em] text-white">
        {showingAgentMfa
          ? "Verify your sign-in."
          : mode === "login"
            ? "Welcome back."
            : mode === "register"
              ? "Create your account."
              : "Reset your password."}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#8d8d87]">
        {showingAgentMfa
          ? "Enter your verification code to finish signing in. Your bookings will be ready when you arrive."
          : mode === "login"
            ? loginRole === "agent"
              ? "Travel agents sign in once here. Shearwater verifies your account and loads your bookings automatically."
              : "One email and password for every portal. After sign-in we send you to the right workspace."
            : mode === "register"
              ? "Choose whether you are a guest or a travel agent. Team Access is invite-only."
              : "We will send a secure reset link to your email."}
      </p>

      {showingAgentMfa ? (
        recoveryCodes.length > 0 ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-4 text-xs text-[#d4c48a]">
              <p className="font-semibold text-white">Save these recovery codes</p>
              <p className="mt-1 leading-5">
                Shown once after setup. Store them somewhere safe before continuing.
              </p>
              <ul className="mt-3 space-y-1 font-mono text-sm text-white">
                {recoveryCodes.map((code) => (
                  <li key={code}>{code}</li>
                ))}
              </ul>
            </div>
            {message && (
              <p
                role="status"
                className="rounded-xl border border-savannah/30 bg-savannah/10 px-4 py-3 text-xs text-[#84d4b0]"
              >
                {message}
              </p>
            )}
            <button
              type="button"
              onClick={() => finishAgentLogin(agentRedirectTo)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f0674e]"
            >
              Continue to agent workspace
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        ) : agentAuthStep.kind !== "credentials" ? (
        <form onSubmit={handleAgentMfaFormSubmit} className="mt-8 space-y-4">
          <p className="text-xs text-[#8d8d87]">
            {agentAuthStep.kind === "mfa_setup"
              ? "Setting up verification for"
              : "Verifying sign-in for"}{" "}
            <span className="text-white">{agentAuthStep.email}</span>
          </p>

          {agentAuthStep.kind === "mfa_setup" && agentAuthStep.setupUri && (
            <div className="rounded-xl border border-[#3a3a36] bg-[#232321] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
                Authenticator setup
              </p>
              <a
                href={agentAuthStep.setupUri}
                className="mt-2 inline-flex text-xs text-savannah hover:underline"
              >
                Open in authenticator app
              </a>
              {agentAuthStep.setupSecret && (
                <p className="mt-2 break-all font-mono text-[11px] text-[#aaa]">
                  Secret: {agentAuthStep.setupSecret}
                </p>
              )}
            </div>
          )}

          {agentAuthStep.kind === "mfa_verify" &&
            agentAuthStep.factors.length > 1 && (
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">
                  Verification method
                </span>
                <select
                  value={mfaFactor}
                  onChange={(event) => setMfaFactor(event.target.value)}
                  className="w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white focus:border-victoria focus:outline-none"
                >
                  {agentAuthStep.factors.map((item) => (
                    <option key={item} value={item}>
                      {GOLDEN_DUSK_MFA_FACTOR_LABELS[item] ?? item}
                    </option>
                  ))}
                </select>
              </label>
            )}

          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">
              Verification code
            </span>
            <input
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              className="w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white placeholder:text-[#62625d] focus:border-victoria focus:outline-none"
              placeholder="6-digit code"
              required
              autoComplete="one-time-code"
            />
          </label>

          {agentAuthStep.kind === "mfa_verify" && mfaFactor === "email" && (
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                resetMessages();
                try {
                  await sendAgentUnifiedLoginEmailOtpAction({
                    email: agentEmail,
                    challengeId: agentAuthStep.challengeId,
                  });
                  setMessage("A new email code has been sent.");
                } catch (cause) {
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Unable to resend the email code.",
                  );
                } finally {
                  setLoading(false);
                }
              }}
              className="text-xs text-[#a5a59f] hover:text-white"
            >
              Resend email code
            </button>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl border border-savannah/30 bg-savannah/10 px-4 py-3 text-xs text-[#84d4b0]"
            >
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f0674e] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Verifying…" : "Complete sign-in"}
              <Icon name="arrow" className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                resetAgentFlow();
                resetMessages();
              }}
              className="rounded-xl border border-[#3a3a36] px-4 py-3 text-sm text-[#a5a59f] hover:text-white"
            >
              Start over
            </button>
          </div>
        </form>
        ) : null
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                name="firstName"
                label="First name"
                autoComplete="given-name"
              />
              <Field
                name="lastName"
                label="Last name"
                autoComplete="family-name"
              />
            </div>
          )}

          {mode === "register" && (
            <fieldset className="space-y-2">
              <legend className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">
                I am signing up as
              </legend>
              <div className="grid gap-2">
                {SIGNUP_ROLES.map((role) => {
                  const selected = signupRole === role.key;
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => setSignupRole(role.key)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-victoria bg-victoria/5"
                          : "border-[#3a3a36] bg-[#232321] hover:border-[#4a4a46]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 block h-1.5 w-8 shrink-0 rounded-full ${role.accent}`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {role.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8d8d87]">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] leading-5 text-[#666660]">
                Team Access only: use the invitation link from your email. Guests
                and travel agents should sign up on the login page instead.
              </p>
            </fieldset>
          )}

          {mode === "login" && (
            <fieldset className="space-y-2">
              <legend className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">
                I am signing in as
              </legend>
              <div className="grid gap-2">
                {LOGIN_ROLES.map((role) => {
                  const selected = loginRole === role.key;
                  return (
                    <button
                      key={role.key}
                      type="button"
                      onClick={() => {
                        setLoginRole(role.key);
                        resetAgentFlow();
                        resetMessages();
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-victoria bg-victoria/5"
                          : "border-[#3a3a36] bg-[#232321] hover:border-[#4a4a46]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 block h-1.5 w-8 shrink-0 rounded-full ${role.accent}`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {role.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#8d8d87]">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <Field
            name="email"
            label="Email address"
            type="email"
            autoComplete="username"
          />
          {mode !== "forgot" && (
            <PasswordInput
              name="password"
              label="Password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={8}
              required
            />
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]"
            >
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl border border-savannah/30 bg-savannah/10 px-4 py-3 text-xs text-[#84d4b0]"
            >
              {message}
            </p>
          )}
          <button
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f0674e] disabled:cursor-wait disabled:opacity-60"
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? loginRole === "agent"
                  ? "Sign in as agent"
                  : "Sign in securely"
                : mode === "register"
                  ? "Create account"
                  : "Send reset link"}
            <Icon name="arrow" className="h-4 w-4" />
          </button>
        </form>
      )}

      {!showingAgentMfa && (
        <div className="mt-6 flex items-center justify-between text-xs">
          <button
            onClick={() => {
              setMode(mode === "register" ? "login" : "register");
              resetAgentFlow();
              resetMessages();
            }}
            className="text-[#a5a59f] hover:text-white"
          >
            {mode === "register"
              ? "Already have an account?"
              : "Create an account"}
          </button>
          {mode !== "forgot" ? (
            <button
              onClick={() => {
                setMode("forgot");
                resetAgentFlow();
                resetMessages();
              }}
              className="text-[#777771] hover:text-white"
            >
              Forgot password?
            </button>
          ) : (
            <button
              onClick={() => setMode("login")}
              className="text-[#a5a59f] hover:text-white"
            >
              Back to sign in
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">
        {label}
      </span>
      <input
        required
        {...props}
        className="w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white placeholder:text-[#62625d] focus:border-victoria focus:outline-none"
      />
    </label>
  );
}
