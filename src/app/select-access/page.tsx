import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SelectAccessPanel } from "@/features/auth/components/SelectAccessPanel";
import { getAvailablePortals } from "@/features/auth/services/auth-routing";
import { getAuthContext } from "@/features/auth/services/auth-context";

export const metadata: Metadata = { title: "Choose workspace" };

export default async function SelectAccessPage() {
  const context = await getAuthContext();
  if (!context) redirect("/auth");

  const portals = await getAvailablePortals(context);
  if (portals.length === 0) redirect("/access-pending");
  if (portals.length === 1) redirect(portals[0].href);

  return (
    <SelectAccessPanel
      fullName={context.fullName}
      email={context.email}
      initials={context.initials}
      portals={portals}
    />
  );
}
