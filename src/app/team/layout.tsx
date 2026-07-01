import type { ReactNode } from "react";
import { AppShell } from "@/layouts/AppShell";
import { redirectIfMissingPortal, getAvailablePortals } from "@/features/auth/services/auth-routing";
import {
  canViewProducts,
  canViewRates,
} from "@/features/products/access";

export default async function TeamLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { context: team, membership } = await redirectIfMissingPortal("team");
  const organizationId = membership.organizationId!;
  const showWorkspaceSwitch = (await getAvailablePortals(team)).length > 1;

  const [showProducts, showRates] = await Promise.all([
    canViewProducts(organizationId),
    canViewRates(organizationId),
  ]);

  return (
    <AppShell
      showWorkspaceSwitch={showWorkspaceSwitch}
      notificationScope={{
        userId: team.userId,
        organizationId,
      }}
      workspaceModules={{
        products: showProducts,
        rates: showRates,
      }}
      user={{
        name: team.fullName,
        role: team.jobTitle,
        initials: team.initials,
        organization:
          membership.organizationName ?? "Shearwater Victoria Falls",
      }}
    >
      {children}
    </AppShell>
  );
}
