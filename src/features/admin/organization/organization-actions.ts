"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasOrganizationPermission, requireAdminPortalContext } from "@/features/auth/services/auth-context";

const departmentSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(500).optional() });
const locationSchema = z.object({ name: z.string().trim().min(2).max(100), code: z.string().trim().min(2).max(20).transform((value) => value.toUpperCase()), address: z.string().trim().max(300).optional(), timezone: z.string().trim().min(1).max(80) });
const teamSchema = z.object({ name: z.string().trim().min(2).max(100), description: z.string().trim().max(500).optional(), departmentId: z.string().uuid().optional() });

async function guard(organizationId: string) {
  const admin = await requireAdminPortalContext();
  if (!admin || admin.membership.organizationId !== organizationId) throw new Error("Admin access is required.");
  if (!(await hasOrganizationPermission(organizationId, "organization.manage"))) throw new Error("You do not have permission to manage organization structure.");
  return admin;
}

async function audit(organizationId: string, actorUserId: string, action: string, entityType: string, entityId: string) {
  await (await createClient()).from("audit_logs").insert({ organization_id: organizationId, actor_user_id: actorUserId, action, entity_type: entityType, entity_id: entityId });
}

export async function createDepartment(organizationId: string, input: unknown) {
  const parsed = departmentSchema.parse(input); const admin = await guard(organizationId); const supabase = await createClient();
  const { data, error } = await supabase.from("departments").insert({ organization_id: organizationId, name: parsed.name, description: parsed.description || null }).select("id").single(); if (error) throw new Error(error.message);
  await audit(organizationId, admin.context.userId, "department.created", "departments", data.id); revalidatePath("/admin/organization");
}

export async function createLocation(organizationId: string, input: unknown) {
  const parsed = locationSchema.parse(input); const admin = await guard(organizationId); const supabase = await createClient();
  const { data, error } = await supabase.from("locations").insert({ organization_id: organizationId, name: parsed.name, code: parsed.code, address: parsed.address || null, timezone: parsed.timezone }).select("id").single(); if (error) throw new Error(error.message);
  await audit(organizationId, admin.context.userId, "location.created", "locations", data.id); revalidatePath("/admin/organization");
}

export async function createTeam(organizationId: string, input: unknown) {
  const parsed = teamSchema.parse(input); const admin = await guard(organizationId); const supabase = await createClient();
  if (parsed.departmentId) { const { data } = await supabase.from("departments").select("id").eq("id", parsed.departmentId).eq("organization_id", organizationId).maybeSingle(); if (!data) throw new Error("Department does not belong to this organization."); }
  const { data, error } = await supabase.from("teams").insert({ organization_id: organizationId, name: parsed.name, description: parsed.description || null, department_id: parsed.departmentId || null }).select("id").single(); if (error) throw new Error(error.message);
  await audit(organizationId, admin.context.userId, "team.created", "teams", data.id); revalidatePath("/admin/organization");
}

export async function setStructureActive(organizationId: string, entity: "departments" | "locations" | "teams", id: string, active: boolean) {
  const admin = await guard(organizationId); const parsedId = z.string().uuid().parse(id); const { error } = await (await createClient()).from(entity).update({ active }).eq("id", parsedId).eq("organization_id", organizationId); if (error) throw new Error(error.message);
  await audit(organizationId, admin.context.userId, `${entity}.status_changed`, entity, parsedId); revalidatePath("/admin/organization");
}
