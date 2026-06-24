import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/layouts/AppShell";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { getNotificationSummary } from "@/features/team/notifications/notification-service";

export default async function TeamLayout({
  children,
}: {
  children: ReactNode;
}) {
  const team = await requireAccessContext("team");
  if (!team) redirect("/auth/continue");
  if (!team.membership.organizationId) redirect("/auth/continue");
  const notificationSummary = await getNotificationSummary(
    team.membership.organizationId,
    team.context.userId,
  );

  return (
    <AppShell
      notifications={notificationSummary}
      notificationScope={{
        userId: team.context.userId,
        organizationId: team.membership.organizationId,
      }}
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
