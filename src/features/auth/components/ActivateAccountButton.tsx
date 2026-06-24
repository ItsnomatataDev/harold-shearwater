"use client";

import { useTransition } from "react";
import { activateSelfMembership } from "@/features/auth/actions/self-service-actions";

export function ActivateAccountButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => activateSelfMembership())}
      className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-black disabled:opacity-40 transition hover:opacity-90"
    >
      {pending ? "Setting up…" : label}
    </button>
  );
}
