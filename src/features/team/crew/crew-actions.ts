"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import type { Json } from "@/types/database";

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

  const tokenHash = randomBytes(32).toString("hex");
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
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (inviteError) throw inviteError;

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

  return { success: true, invitationId: invitation.id };
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
