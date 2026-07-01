import type { ReactNode } from "react";
import { CustomerShell } from "@/layouts/CustomerShell";
import { redirectIfMissingPortal, getAvailablePortals } from "@/features/auth/services/auth-routing";

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { context: customer } = await redirectIfMissingPortal("customer");
  const showWorkspaceSwitch = (await getAvailablePortals(customer)).length > 1;

  return (
    <CustomerShell
      showWorkspaceSwitch={showWorkspaceSwitch}
      name={customer.fullName}
      initials={customer.initials}
      email={customer.email}
    >
      {children}
    </CustomerShell>
  );
}
