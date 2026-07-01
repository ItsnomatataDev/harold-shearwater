import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/layouts/AdminShell";
import { requireAdminLayoutContext } from "@/features/auth/services/auth-context";
import { redirectIfMissingAdmin, getAvailablePortals } from "@/features/auth/services/auth-routing";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  await redirectIfMissingAdmin();
  const admin = await requireAdminLayoutContext();
  if (!admin) redirect("/access-pending");
  const showWorkspaceSwitch =
    (await getAvailablePortals(admin.context)).length > 1;

  return (
    <AdminShell
      showWorkspaceSwitch={showWorkspaceSwitch}
      isPlatformAdmin={admin.isPlatformAdmin}
      user={{
        name: admin.context.fullName,
        role: admin.isPlatformAdmin
          ? "Platform Administrator"
          : admin.context.jobTitle,
        initials: admin.context.initials,
        organization: admin.membership.organizationName ?? "Shearwater",
      }}
    >
      {children}
    </AdminShell>
  );
}
