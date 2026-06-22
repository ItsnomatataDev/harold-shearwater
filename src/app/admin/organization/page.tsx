import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasOrganizationPermission, requireAdminPortalContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { getOrganizationStructure } from "@/features/admin/organization/organization-service";
import { OrganizationStructure } from "@/features/admin/organization/components/OrganizationStructure";

export const metadata: Metadata = { title: "Organization Structure" };

export default async function OrganizationPage() {
  const admin = await requireAdminPortalContext(); if (!admin?.membership.organizationId) redirect("/access-pending");
  const organizationId = admin.membership.organizationId; if (!(await hasOrganizationPermission(organizationId, "organization.manage"))) redirect("/admin/dashboard");
  const data = await getOrganizationStructure(organizationId);
  return <section className="space-y-6"><ModuleHeader eyebrow="Admin Portal" title="Organization Structure" description="Manage the departments, locations, and operational teams that staff, duties, attendance, and reporting depend on."/><OrganizationStructure organizationId={organizationId} data={data}/></section>;
}
