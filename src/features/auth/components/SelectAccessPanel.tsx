"use client";

import { useTransition } from "react";
import { Icon } from "@/components/Icon";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { selectPortal } from "@/features/auth/actions/portal-actions";
import type { PortalChoice } from "@/features/auth/services/auth-routing";

const portalIcons: Record<string, "home" | "route" | "users" | "settings"> = {
  team: "home",
  agent: "route",
  customer: "users",
  admin: "settings",
};

export function SelectAccessPanel({
  fullName,
  email,
  initials,
  portals,
}: {
  fullName: string;
  email: string;
  initials: string;
  portals: PortalChoice[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <main className="grid min-h-screen place-items-center bg-[#111] px-6 py-12">
      <section className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#1d1d1b] text-sm font-bold text-white ring-1 ring-[#343431]">
            {initials}
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[.16em] text-victoria">
            Choose your workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            Welcome back, {fullName.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sm text-[#91918b]">
            You have access to more than one Shearwater workspace. Choose where
            to go — we&apos;ll remember your choice for next time.
          </p>
          <p className="mt-1 text-xs text-[#666660]">{email}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {portals.map((portal) => (
            <button
              key={portal.key}
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await selectPortal(portal.key);
                })
              }
              className="group rounded-2xl border border-[#343431] bg-[#1d1d1b] p-5 text-left transition hover:border-[#4a4a46] hover:bg-[#222220] disabled:opacity-60"
            >
              <span
                className={`mb-4 block h-1.5 w-10 rounded-full ${portal.accentClass}`}
              />
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-[#aaa] group-hover:text-white">
                  <Icon
                    name={portalIcons[portal.key] ?? "home"}
                    className="h-4 w-4"
                  />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{portal.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#8d8d87]">
                    {portal.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
