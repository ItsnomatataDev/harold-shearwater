"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

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
  metadata: Record<string, any>,
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

export async function inviteTeamMember(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = InviteMemberSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // TODO: Implement permission check via membership_roles
  // For now, allow team members to invite (simplified)

  const tokenHash = require("crypto").randomBytes(32).toString("hex");
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
  input: Record<string, any>,
) {
  const parsed = AssignRoleSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Generated Supabase types may not include RPC signatures in early migrations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: canManageRoles, error: permissionError } = await (
    supabase as any
  ).rpc("has_permission", {
    target_organization_id: organizationId,
    required_permission: "roles.manage",
  });

  if (permissionError) throw permissionError;
  if (!canManageRoles) {
    throw new Error("You do not have permission to assign roles.");
  }

  // Use server-side function for deterministic authorization and upsert behavior.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("assign_role_to_member", {
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
  input: Record<string, any>,
) {
  const parsed = SuspendMemberSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // TODO: Implement permission check via membership_roles
  // For now, allow team members to suspend (simplified)

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
  input: Record<string, any>,
) {
  const parsed = ActivateMemberSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // TODO: Implement permission check via membership_roles
  // For now, allow team members to activate (simplified)

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
