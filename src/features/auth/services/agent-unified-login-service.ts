import "server-only";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PREFERRED_PORTAL_COOKIE } from "@/features/auth/services/auth-routing";
import { GoldenDuskApiError } from "@/features/integrations/golden-dusk/client";
import {
  goldenDuskAgentLogin,
  goldenDuskAgentMfaConfirm,
  goldenDuskAgentMfaSetup,
  goldenDuskAgentSendEmailOtp,
  goldenDuskAgentVerifyMfa,
} from "@/features/integrations/golden-dusk/agent-auth-client";
import { resolveGoldenDuskLoginNextStep } from "@/features/integrations/golden-dusk/agent-auth-utils";
import type {
  GoldenDuskAgentAuthResult,
  GoldenDuskLoginNextStep,
} from "@/features/integrations/golden-dusk/agent-auth-types";
import {
  clearGoldenDuskAuthChallenge,
  createGoldenDuskAuthChallenge,
  getGoldenDuskAuthChallenge,
  getGoldenDuskAccessToken,
  saveGoldenDuskAgentConnection,
  syncGoldenDuskConnectionProfile,
} from "@/features/integrations/golden-dusk/agent-auth-service";

export type ApprovedAgentMembership = {
  userId: string;
  membershipId: string;
  organizationId: string;
};

async function findAuthUserByEmail(email: string) {
  const admin = createAdminClient();
  const target = email.toLowerCase();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", target)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (profile?.id) {
    const { data, error } = await admin.auth.admin.getUserById(profile.id);
    if (error) throw new Error(error.message);
    if (data.user) return data.user;
  }

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

export async function resolveApprovedAgentMembership(
  email: string,
): Promise<ApprovedAgentMembership | null> {
  const user = await findAuthUserByEmail(email);
  if (!user) return null;

  const admin = createAdminClient();
  const { data: membership, error } = await admin
    .from("access_memberships")
    .select("id, organization_id, status, access_type")
    .eq("user_id", user.id)
    .eq("access_type", "agent")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (
    !membership ||
    membership.status !== "active" ||
    !membership.organization_id
  ) {
    return null;
  }

  return {
    userId: user.id,
    membershipId: membership.id,
    organizationId: membership.organization_id,
  };
}

function formatSwibmsError(error: GoldenDuskApiError): string {
  const normalized = error.message.toLowerCase();

  if (error.status === 429) {
    return "The booking system is receiving too many sign-in attempts right now. Wait one or two minutes, then try again. Your Shearwater agent account is fine — this is a temporary limit on the booking server.";
  }
  if (normalized.includes("invalid verification code")) {
    return "That verification code was not accepted. Check your authenticator app and try again, or request a new email code.";
  }
  if (error.status === 401 || error.status === 403) {
    return "Email or password was not accepted by the booking system. Use the same credentials Franklin gave you for SWAIBMS.";
  }
  if (error.message.toLowerCase().includes("goldendusk")) {
    return error.message.replace(/GoldenDusk/gi, "booking system");
  }
  return error.message;
}

async function tryCompleteAfterRateLimit(input: {
  email: string;
  password: string;
  membership: ApprovedAgentMembership;
  challengeId: string;
}) {
  if (
    !(await tryResumeWithExistingBookingSession({
      email: input.email,
      password: input.password,
      membership: input.membership,
    }))
  ) {
    return null;
  }

  await clearGoldenDuskAuthChallenge(
    input.membership.membershipId,
    input.challengeId,
  );

  return {
    ok: true as const,
    agencyName: null,
    recoveryCodes: [] as string[],
    resumedExistingSession: true,
  };
}

function mapSwibmsError(error: unknown): never {
  if (error instanceof GoldenDuskApiError) {
    throw new Error(formatSwibmsError(error));
  }
  throw error;
}

async function setAgentPortalPreference() {
  const cookieStore = await cookies();
  cookieStore.set(PREFERRED_PORTAL_COOKIE, "agent", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

async function tryResumeWithExistingBookingSession(input: {
  email: string;
  password: string;
  membership: ApprovedAgentMembership;
}) {
  const session = await getGoldenDuskAccessToken(input.membership.membershipId);
  if (!session?.token) return false;

  await establishSupabaseSession(input.email, input.password);
  await setAgentPortalPreference();
  return true;
}

async function resolveChallengeForEmail(email: string, challengeId: string) {
  const membership = await resolveApprovedAgentMembership(email);
  if (!membership) {
    throw new Error("Your sign-in session expired. Please try again.");
  }

  const challenge = await getGoldenDuskAuthChallenge(
    membership.membershipId,
    challengeId,
  );

  return { membership, challenge };
}

async function establishSupabaseSession(email: string, password: string) {
  const supabase = await createClient();
  let { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error?.message.toLowerCase().includes("invalid login credentials")) {
    const user = await findAuthUserByEmail(email);
    if (!user) {
      throw new Error(
        "Your booking account was verified, but no Shearwater login exists for this email.",
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password },
    );
    if (updateError) {
      throw new Error(
        "Your booking account was verified, but Shearwater sign-in failed. Contact support.",
      );
    }

    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  }

  if (error) {
    throw new Error(
      error.message.toLowerCase().includes("invalid login credentials")
        ? "Email or password is incorrect."
        : error.message,
    );
  }
}

async function finalizeAgentLogin(input: {
  email: string;
  password: string;
  membership: ApprovedAgentMembership;
  auth: GoldenDuskAgentAuthResult;
  challengeId: string;
}) {
  await saveGoldenDuskAgentConnection({
    membershipId: input.membership.membershipId,
    organizationId: input.membership.organizationId,
    auth: input.auth,
  });
  await syncGoldenDuskConnectionProfile(input.membership.membershipId).catch(
    () => null,
  );
  await clearGoldenDuskAuthChallenge(
    input.membership.membershipId,
    input.challengeId,
  );
  await establishSupabaseSession(input.email, input.password);
  await setAgentPortalPreference();
}

export function resolveAgentLoginRedirect(requestedPath?: string | null) {
  if (requestedPath?.startsWith("/agent")) return requestedPath;
  return "/agent/dashboard";
}

export async function startAgentUnifiedLogin(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const membership = await resolveApprovedAgentMembership(normalizedEmail);

  if (!membership) {
    const user = await findAuthUserByEmail(normalizedEmail);
    if (!user) {
      throw new Error(
        "No Shearwater account found for this email. Create an account first, then request agent access.",
      );
    }

    const admin = createAdminClient();
    const { data: pendingMembership } = await admin
      .from("access_memberships")
      .select("status, access_type")
      .eq("user_id", user.id)
      .eq("access_type", "agent")
      .maybeSingle();

    if (pendingMembership?.status === "invited") {
      throw new Error(
        "Your agent access is still awaiting Shearwater approval. You will receive an email when it is ready.",
      );
    }

    throw new Error(
      "Active agent access was not found for this email. Sign up as a travel agent or contact Shearwater support.",
    );
  }

  try {
    const result = await goldenDuskAgentLogin(normalizedEmail, password);
    if (!result.mfaChallengeToken) {
      throw new Error(
        result.message || "Sign-in could not be completed. Please try again.",
      );
    }

    const nextStep = resolveGoldenDuskLoginNextStep(result);
    const challenge = await createGoldenDuskAuthChallenge(membership.membershipId, {
      challengeToken: result.mfaChallengeToken,
      factors: result.factors ?? (nextStep === "mfa_setup" ? [] : ["totp"]),
    });

    return {
      status: "mfa" as const,
      challengeId: challenge.challengeId,
      factors: challenge.factors,
      nextStep,
      message: result.message,
      email: normalizedEmail,
    };
  } catch (error) {
    if (
      error instanceof GoldenDuskApiError &&
      error.status === 429 &&
      (await tryResumeWithExistingBookingSession({
        email: normalizedEmail,
        password,
        membership,
      }))
    ) {
      return {
        status: "complete" as const,
        email: normalizedEmail,
        usedExistingBookingSession: true,
      };
    }

    mapSwibmsError(error);
  }
}

export async function beginAgentUnifiedLoginMfaSetup(
  email: string,
  challengeId: string,
) {
  const { challenge } = await resolveChallengeForEmail(email, challengeId);

  try {
    return await goldenDuskAgentMfaSetup(challenge.challengeToken);
  } catch (error) {
    mapSwibmsError(error);
  }
}

export async function sendAgentUnifiedLoginEmailOtp(
  email: string,
  challengeId: string,
) {
  const { challenge } = await resolveChallengeForEmail(email, challengeId);

  try {
    await goldenDuskAgentSendEmailOtp(challenge.challengeToken);
    return { ok: true as const };
  } catch (error) {
    mapSwibmsError(error);
  }
}

export async function completeAgentUnifiedLoginMfa(input: {
  email: string;
  password: string;
  challengeId: string;
  code: string;
  factor?: string;
}) {
  const { membership, challenge } = await resolveChallengeForEmail(
    input.email,
    input.challengeId,
  );

  try {
    const auth = await goldenDuskAgentVerifyMfa({
      challengeToken: challenge.challengeToken,
      factor: input.factor ?? challenge.factors[0] ?? "totp",
      code: input.code,
    });

    await finalizeAgentLogin({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      membership,
      auth,
      challengeId: input.challengeId,
    });

    return {
      ok: true as const,
      agencyName: auth.agencyName,
      recoveryCodes: auth.recoveryCodes ?? [],
    };
  } catch (error) {
    if (error instanceof GoldenDuskApiError && error.status === 429) {
      const resumed = await tryCompleteAfterRateLimit({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        membership,
        challengeId: input.challengeId,
      });
      if (resumed) return resumed;
    }
    mapSwibmsError(error);
  }
}

export async function confirmAgentUnifiedLoginMfaSetup(input: {
  email: string;
  password: string;
  challengeId: string;
  code: string;
}) {
  const { membership, challenge } = await resolveChallengeForEmail(
    input.email,
    input.challengeId,
  );

  try {
    const auth = await goldenDuskAgentMfaConfirm({
      challengeToken: challenge.challengeToken,
      code: input.code,
    });

    await finalizeAgentLogin({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      membership,
      auth,
      challengeId: input.challengeId,
    });

    return {
      ok: true as const,
      agencyName: auth.agencyName,
      recoveryCodes: auth.recoveryCodes ?? [],
    };
  } catch (error) {
    if (error instanceof GoldenDuskApiError && error.status === 429) {
      const resumed = await tryCompleteAfterRateLimit({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        membership,
        challengeId: input.challengeId,
      });
      if (resumed) return resumed;
    }
    mapSwibmsError(error);
  }
}

export type AgentUnifiedLoginStartResult =
  | {
      status: "mfa";
      challengeId: string;
      factors: string[];
      nextStep: GoldenDuskLoginNextStep;
      message: string | null;
      email: string;
    }
  | {
      status: "complete";
      email: string;
      usedExistingBookingSession: boolean;
    };
