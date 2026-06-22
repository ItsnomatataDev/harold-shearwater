"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";

type Mode = "login" | "register" | "forgot";
type AccessType = "team" | "agent" | "customer";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
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
        const portalAccessRaw = String(form.get("portalAccess") ?? "customer")
          .trim()
          .toLowerCase();
        const portalAccess: AccessType =
          portalAccessRaw === "team" || portalAccessRaw === "agent"
            ? portalAccessRaw
            : "customer";
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/continue`,
            data: {
              first_name: firstName,
              last_name: lastName,
              portal_access: portalAccess,
            },
          },
        });
        if (signUpError) throw signUpError;
        setMessage(
          "Account created. Check your email to confirm your address, then sign in.",
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      const requestedPath = searchParams?.get("next");
      router.replace(
        requestedPath?.startsWith("/") ? requestedPath : "/auth/continue",
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-11 w-11 grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-[#1b1b19] p-1.5">
          <span className="rounded-tl bg-sunset" />
          <span className="rounded-tr-full bg-gold" />
          <span className="rounded-bl-full bg-victoria" />
          <span className="rounded-br bg-savannah" />
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
        {mode === "login"
          ? "Welcome back."
          : mode === "register"
            ? "Create your account."
            : "Reset your password."}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#8d8d87]">
        {mode === "login"
          ? "One secure login for Team, Agent and Customer Access."
          : mode === "register"
            ? "Choose which portal account to create for testing while you build."
            : "We will send a secure reset link to your email."}
      </p>
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
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">
              Portal access
            </span>
            <select
              name="portalAccess"
              defaultValue="customer"
              className="w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white focus:border-victoria focus:outline-none"
            >
              <option value="customer">Customer</option>
              <option value="agent">Agent</option>
              <option value="team">Team</option>
            </select>
            <span className="mt-2 block text-[10px] text-[#6f6f69]">
              For production, Team and Agent users should be invited by admins.
              This option is for build-stage testing.
            </span>
          </label>
        )}
        <Field
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
        />
        {mode !== "forgot" && (
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={8}
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
              ? "Sign in securely"
              : mode === "register"
                ? "Create account"
                : "Send reset link"}
          <Icon name="arrow" className="h-4 w-4" />
        </button>
      </form>
      <div className="mt-6 flex items-center justify-between text-xs">
        <button
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError(null);
            setMessage(null);
          }}
          className="text-[#a5a59f] hover:text-white"
        >
          {mode === "register"
            ? "Already have an account?"
            : "Create customer account"}
        </button>
        {mode !== "forgot" ? (
          <button
            onClick={() => {
              setMode("forgot");
              setError(null);
              setMessage(null);
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
