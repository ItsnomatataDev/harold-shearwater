"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Json } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminPortalContext } from "@/features/auth/services/auth-context";

const InviteMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
});

const AssignRoleSchema = z.object({
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
});

const SuspendMemberSchema = z.object({
  membershipId: z.string().uuid(),
});

const ActivateMemberSchema = z.object({
  membershipId: z.string().uuid(),
});

const RevokeInvitationSchema = z.object({ invitationId: z.string().uuid() });
const UpdateStaffSchema = z.object({ membershipId: z.string().uuid(), departmentId: z.string().uuid().nullable(), locationId: z.string().uuid().nullable(), managerMembershipId: z.string().uuid().nullable(), employeeNumber: z.string().trim().max(50).nullable(), jobTitle: z.string().trim().max(120).nullable(), teamIds: z.array(z.string().uuid()) });

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Json,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });

  if (error) {
    // Do not fail primary user actions if audit write is temporarily blocked.
    console.error("Audit log write failed", {
      action,
      entityType,
      entityId,
      code: error.code,
      message: error.message,
    });
  }
}

async function requirePermission(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  permission: "members.manage" | "roles.manage",
  deniedMessage: string,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("User not authenticated");

  const { data, error } = await supabase.rpc("has_permission", {
    target_organization_id: organizationId,
    required_permission: permission,
  });

  if (!error) {
    if (!data) throw new Error(deniedMessage);
    return;
  }

  const missingPublicRpc = error.message.includes(
    "Could not find the function public.has_permission",
  );

  if (!missingPublicRpc) throw error;

  const { data: permissionRow, error: permissionError } = await supabase
    .from("permissions")
    .select("id")
    .eq("key", permission)
    .maybeSingle();

  if (permissionError) throw permissionError;
  if (!permissionRow) throw new Error(deniedMessage);

  const { data: memberships, error: membershipsError } = await supabase
    .from("access_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .eq("access_type", "team")
    .eq("status", "active");

  if (membershipsError) throw membershipsError;

  const membershipIds = (memberships ?? []).map((membership) => membership.id);
  if (!membershipIds.length) throw new Error(deniedMessage);

  const { data: membershipRoles, error: membershipRolesError } = await supabase
    .from("membership_roles")
    .select("role_id")
    .in("membership_id", membershipIds);

  if (membershipRolesError) throw membershipRolesError;

  const roleIds = Array.from(
    new Set((membershipRoles ?? []).map((item) => item.role_id)),
  );
  if (!roleIds.length) throw new Error(deniedMessage);

  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .from("role_permissions")
    .select("role_id")
    .eq("permission_id", permissionRow.id)
    .in("role_id", roleIds)
    .limit(1);

  if (rolePermissionsError) throw rolePermissionsError;
  if (!(rolePermissions ?? []).length) throw new Error(deniedMessage);
}

export async function inviteTeamMember(
  organizationId: string,
  input: unknown,
) {
  const parsed = InviteMemberSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  await requirePermission(
    supabase,
    organizationId,
    "members.manage",
    "You do not have permission to invite team members.",
  );

  const rawToken = randomBytes(32).toString("hex");
  const storedHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: invitation, error: inviteError } = await supabase
    .from("invitations")
    .insert({
      organization_id: organizationId,
      email: parsed.email,
      access_type: "team",
      role_id: parsed.roleId,
      token_hash: storedHash,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (inviteError) throw inviteError;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
  const next = `/auth/accept-invitation?token=${encodeURIComponent(rawToken)}`;
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", next);
  const acceptanceUrl = new URL("/auth/accept-invitation", origin);
  acceptanceUrl.searchParams.set("token", rawToken);

  let emailSent = false;
  let deliveryMessage = "Invitation link created. Share it securely with the invited person.";
  try {
    const { error: deliveryError } = await createAdminClient().auth.admin.inviteUserByEmail(parsed.email, { redirectTo: callbackUrl.toString(), data: { invitation_id: invitation.id } });
    if (!deliveryError) { emailSent = true; deliveryMessage = `Invitation email sent to ${parsed.email}.`; }
    else if (!deliveryError.message.toLowerCase().includes("already")) deliveryMessage = `Invitation created, but email delivery failed: ${deliveryError.message}`;
  } catch (cause) {
    deliveryMessage = `Invitation created, but email delivery is unavailable: ${cause instanceof Error ? cause.message : "Unknown delivery error"}`;
  }

  await logAudit(
    supabase,
    organizationId,
    "member.invited",
    "invitation",
    invitation.id,
    {
      email: parsed.email,
      roleId: parsed.roleId,
    },
  );

  revalidatePath("/admin/staff");
  return { success: true, invitationId: invitation.id, acceptanceUrl: acceptanceUrl.toString(), emailSent, deliveryMessage };
}

export async function revokeTeamInvitation(organizationId: string, input: unknown) {
  const parsed = RevokeInvitationSchema.parse(input); const supabase = await createClient();
  await requirePermission(supabase, organizationId, "members.manage", "You do not have permission to revoke invitations.");
  const { error } = await supabase.from("invitations").delete().eq("id", parsed.invitationId).eq("organization_id", organizationId).is("accepted_at", null); if (error) throw new Error(error.message);
  revalidatePath("/admin/staff");
}

export async function updateStaffAssignment(organizationId: string, input: unknown) {
  const parsed = UpdateStaffSchema.parse(input); const admin = await requireAdminPortalContext(); if (!admin || admin.membership.organizationId !== organizationId) throw new Error("Admin access is required.");
  const supabase = await createClient(); await requirePermission(supabase, organizationId, "members.manage", "You do not have permission to update staff.");
  const { data: membership, error: membershipError } = await supabase.from("access_memberships").select("id,user_id").eq("id", parsed.membershipId).eq("organization_id", organizationId).eq("access_type", "team").maybeSingle(); if (membershipError) throw new Error(membershipError.message); if (!membership) throw new Error("Staff membership not found.");
  if (parsed.managerMembershipId === parsed.membershipId) throw new Error("A staff member cannot report to themselves.");
  const validReferences = [parsed.departmentId ? supabase.from("departments").select("id").eq("id", parsed.departmentId).eq("organization_id", organizationId).maybeSingle() : Promise.resolve({ data: { id: "" }, error: null }), parsed.locationId ? supabase.from("locations").select("id").eq("id", parsed.locationId).eq("organization_id", organizationId).maybeSingle() : Promise.resolve({ data: { id: "" }, error: null }), parsed.managerMembershipId ? supabase.from("access_memberships").select("id").eq("id", parsed.managerMembershipId).eq("organization_id", organizationId).eq("status", "active").maybeSingle() : Promise.resolve({ data: { id: "" }, error: null })];
  const [department, location, manager] = await Promise.all(validReferences); if (!department.data || !location.data || !manager.data) throw new Error("A selected department, location, or manager is invalid.");
  if (parsed.teamIds.length) { const { data } = await supabase.from("teams").select("id").eq("organization_id", organizationId).in("id", parsed.teamIds); if ((data ?? []).length !== new Set(parsed.teamIds).size) throw new Error("One or more selected teams are invalid."); }
  const { error } = await supabase.from("access_memberships").update({ department_id: parsed.departmentId, primary_location_id: parsed.locationId, manager_membership_id: parsed.managerMembershipId, employee_number: parsed.employeeNumber }).eq("id", parsed.membershipId); if (error) throw new Error(error.message);
  const profileResult = await supabase.from("profiles").update({ job_title: parsed.jobTitle }).eq("id", membership.user_id); if (profileResult.error) throw new Error(profileResult.error.message);
  const deleteResult = await supabase.from("team_members").delete().eq("membership_id", parsed.membershipId); if (deleteResult.error) throw new Error(deleteResult.error.message);
  if (parsed.teamIds.length) { const insertResult = await supabase.from("team_members").insert(parsed.teamIds.map((teamId) => ({ team_id: teamId, membership_id: parsed.membershipId }))); if (insertResult.error) throw new Error(insertResult.error.message); }
  await logAudit(supabase, organizationId, "member.assignment_updated", "access_memberships", parsed.membershipId, { departmentId: parsed.departmentId, locationId: parsed.locationId, managerMembershipId: parsed.managerMembershipId, teamIds: parsed.teamIds });
  revalidatePath("/admin/staff"); revalidatePath("/team", "layout");
}

export async function assignRoleToMember(
  organizationId: string,
  input: unknown,
) {
  const parsed = AssignRoleSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  await requirePermission(
    supabase,
    organizationId,
    "roles.manage",
    "You do not have permission to assign roles.",
  );

  const { error } = await supabase.rpc("assign_role_to_member", {
    target_membership_id: parsed.membershipId,
    target_role_id: parsed.roleId,
    target_organization_id: organizationId,
  });

  if (error) {
    if (error.code === "42501") {
      throw new Error(
        "Role assignment blocked by access policy. Contact an admin to grant roles.manage.",
      );
    }
    throw new Error(
      `Role assignment failed (${error.code ?? "unknown"}): ${error.message}`,
    );
  }

  await logAudit(
    supabase,
    organizationId,
    "role.assigned",
    "membership_roles",
    parsed.membershipId,
    {
      roleId: parsed.roleId,
    },
  );

  return { success: true };
}

export async function suspendMember(
  organizationId: string,
  input: unknown,
) {
  const parsed = SuspendMemberSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  await requirePermission(
    supabase,
    organizationId,
    "members.manage",
    "You do not have permission to suspend members.",
  );

  const { error } = await supabase
    .from("access_memberships")
    .update({ status: "suspended" })
    .eq("id", parsed.membershipId);

  if (error) throw error;

  await logAudit(
    supabase,
    organizationId,
    "member.suspended",
    "access_memberships",
    parsed.membershipId,
    {},
  );

  return { success: true };
}

export async function activateMember(
  organizationId: string,
  input: unknown,
) {
  const parsed = ActivateMemberSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  await requirePermission(
    supabase,
    organizationId,
    "members.manage",
    "You do not have permission to activate members.",
  );

  const { error } = await supabase
    .from("access_memberships")
    .update({ status: "active", joined_at: new Date().toISOString() })
    .eq("id", parsed.membershipId);

  if (error) throw error;

  await logAudit(
    supabase,
    organizationId,
    "member.activated",
    "access_memberships",
    parsed.membershipId,
    {},
  );

  return { success: true };
}
