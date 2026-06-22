import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/layouts/AppShell";
import { requireAccessContext } from "@/features/auth/services/auth-context";

export default async function TeamLayout({
  children,
}: {
  children: ReactNode;
}) {
  const team = await requireAccessContext("team");
  if (!team) redirect("/auth/continue");
  return (
    <AppShell
      user={{
        name: team.context.fullName,
        role: team.context.jobTitle,
        initials: team.context.initials,
        organization:
          team.membership.organizationName ?? "Shearwater Victoria Falls",
      }}
    >
      {children}
    </AppShell>
  );
}
