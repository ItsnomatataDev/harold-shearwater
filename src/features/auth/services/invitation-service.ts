import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const tokenSchema = z.string().length(64).regex(/^[a-f0-9]+$/);

export type TeamInvitationDetails = {
  invitationId: string;
  email: string;
  organizationName: string;
  roleName: string;
  expiresAt: string;
};

type InvitationRow = {
  id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
  access_type: string;
  organizations: { name: string | null } | null;
  roles: { name: string | null } | null;
};

const INVITATION_SELECT =
  "id, email, expires_at, accepted_at, access_type, organizations(name), roles(name)";

function toDetails(row: InvitationRow): TeamInvitationDetails | null {
  if (row.access_type !== "team") return null;
  if (row.accepted_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return {
    invitationId: row.id,
    email: row.email,
    organizationName: row.organizations?.name ?? "Shearwater",
    roleName: row.roles?.name ?? "Team Member",
    expiresAt: row.expires_at,
  };
}

export async function getTeamInvitationByToken(
  rawToken: string,
): Promise<TeamInvitationDetails | null> {
  const token = tokenSchema.safeParse(rawToken);
  if (!token.success) return null;

  const tokenHash = createHash("sha256").update(token.data).digest("hex");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("invitations")
    .select(INVITATION_SELECT)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !data) return null;
  return toDetails(data as InvitationRow);
}

export async function getTeamInvitationById(
  invitationId: string,
): Promise<TeamInvitationDetails | null> {
  if (!z.string().uuid().safeParse(invitationId).success) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitations")
    .select(INVITATION_SELECT)
    .eq("id", invitationId)
    .maybeSingle();

  if (error || !data) return null;
  return toDetails(data as InvitationRow);
}

/**
 * Resolve a pending Team Access invitation for the currently signed-in user,
 * using the invitation_id stored in their auth metadata (set when the admin
 * sends a Supabase invite email). The invitation email must match the user's
 * email and must still be pending and unexpired.
 */
export async function getPendingInvitationForCurrentUser(): Promise<TeamInvitationDetails | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const invitationId = user.user_metadata?.invitation_id;
  if (typeof invitationId !== "string") return null;

  const details = await getTeamInvitationById(invitationId);
  if (!details) return null;
  if (details.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return null;
  }
  return details;
}
