"use client";

import { useTransition } from "react";
import { requestAgentAccess } from "@/features/auth/actions/self-service-actions";

export function RequestAgentAccessButton({ label }: { label: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => requestAgentAccess())}
      className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
    >
      {pending ? "Submitting…" : label}
    </button>
  );
}
