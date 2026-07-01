"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { PasswordInput } from "@/components/PasswordInput";

type Mode = "login" | "register" | "forgot";
type SignupRole = "customer" | "agent";

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

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams?.get("next") ?? "";

  const [mode, setMode] = useState<Mode>("login");
  const [signupRole, setSignupRole] = useState<SignupRole>("customer");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
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
      const message =
        cause instanceof Error
          ? cause.message
          : "Authentication failed. Please try again.";
      setError(
        message.toLowerCase().includes("invalid login credentials")
          ? "Email or password is incorrect. Use Forgot password to reset, or confirm you are signing in (not creating a new account)."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

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
        {mode === "login"
          ? "Welcome back."
          : mode === "register"
            ? "Create your account."
            : "Reset your password."}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#8d8d87]">
        {mode === "login"
          ? "One email and password for every portal. After sign-in we send you to the right workspace."
          : mode === "register"
            ? "Choose whether you are a guest or a travel agent. Team Access is invite-only."
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
            : "Create an account"}
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
