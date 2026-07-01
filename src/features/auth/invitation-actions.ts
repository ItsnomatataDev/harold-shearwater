"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTeamInvitationByToken,
  getTeamInvitationById,
  type TeamInvitationDetails,
} from "@/features/auth/services/invitation-service";
import { resolvePostAuthDestination } from "@/features/auth/services/auth-routing";

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters for your password.");

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const target = email.toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find(
      (user) => (user.email ?? "").toLowerCase() === target,
    );
    if (match) return match;
    if (data.users.length < perPage) break;
  }
  return null;
}

/**
 * Provision (or password-set) the auth account for a Team Access invite that was
 * opened via the secure link while signed out. Possession of the secret invite
 * token authorizes setting the password for the invited email. Existing accounts
 * that already have active memberships are never touched — those users must sign
 * in with their existing password instead.
 */
export async function provisionInvitedTeamAccount(input: {
  token?: string | null;
  invitationId?: string | null;
  password: string;
}): Promise<{ email: string; requiresSignIn: boolean }> {
  const password = passwordSchema.parse(input.password);

  let invitation: TeamInvitationDetails | null = null;
  if (input.token) {
    invitation = await getTeamInvitationByToken(input.token);
  }
  if (!invitation && input.invitationId) {
    invitation = await getTeamInvitationById(input.invitationId);
  }
  if (!invitation) {
    throw new Error("This invitation is no longer valid or has expired.");
  }

  const admin = createAdminClient();
  const existingUser = await findAuthUserByEmail(admin, invitation.email);

  if (existingUser) {
    const { count, error: membershipError } = await admin
      .from("access_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", existingUser.id)
      .eq("status", "active");
    if (membershipError) throw new Error(membershipError.message);

    if ((count ?? 0) > 0) {
      // Real, established account — do not reset its password.
      return { email: invitation.email, requiresSignIn: true };
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      existingUser.id,
      {
        password,
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          invitation_id: invitation.invitationId,
          portal_access: "team",
        },
      },
    );
    if (updateError) throw new Error(updateError.message);
    return { email: invitation.email, requiresSignIn: false };
  }

  const { error: createError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: {
      invitation_id: invitation.invitationId,
      portal_access: "team",
    },
  });
  if (createError) throw new Error(createError.message);

  return { email: invitation.email, requiresSignIn: false };
}

async function requireSignedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Sign in with the invited email to accept this invitation.");
  }
  return supabase;
}

export async function acceptTeamInvitation(rawToken: string) {
  const token = z.string().length(64).regex(/^[a-f0-9]+$/).parse(rawToken);
  const supabase = await requireSignedInUser();

  const { error } = await supabase.rpc("accept_team_invitation", {
    raw_token: token,
  });
  if (error) throw new Error(error.message);

  redirect(await resolvePostAuthDestination("/team/dashboard"));
}

export async function acceptTeamInvitationById(invitationId: string) {
  const id = z.string().uuid().parse(invitationId);
  const supabase = await requireSignedInUser();

  // RPC signature is added in a later migration; cast until types regenerate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("accept_team_invitation_by_id", {
    p_invitation_id: id,
  });
  if (error) throw new Error(error.message);

  redirect(await resolvePostAuthDestination("/team/dashboard"));
}
