import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/layouts/AdminShell";
import { requireAdminPortalContext } from "@/features/auth/services/auth-context";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdminPortalContext();
  if (!admin) redirect("/access-pending");

  return (
    <AdminShell
      user={{
        name: admin.context.fullName,
        role: admin.context.jobTitle,
        initials: admin.context.initials,
        organization: admin.membership.organizationName ?? "Shearwater",
      }}
    >
      {children}
    </AdminShell>
  );
}
