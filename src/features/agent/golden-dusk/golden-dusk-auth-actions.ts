"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { GoldenDuskApiError } from "@/features/integrations/golden-dusk/client";
import {
  goldenDuskAgentLogin,
  goldenDuskAgentMfaConfirm,
  goldenDuskAgentMfaSetup,
  goldenDuskAgentSendEmailOtp,
  goldenDuskAgentVerifyMfa,
} from "@/features/integrations/golden-dusk/agent-auth-client";
import { resolveGoldenDuskLoginNextStep } from "@/features/integrations/golden-dusk/agent-auth-utils";
import {
  clearGoldenDuskAuthChallenge,
  createGoldenDuskAuthChallenge,
  disconnectGoldenDuskAgent,
  getGoldenDuskAuthChallenge,
  getGoldenDuskConnectionSummary,
  saveGoldenDuskAgentConnection,
  syncGoldenDuskConnectionProfile,
} from "@/features/integrations/golden-dusk/agent-auth-service";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const mfaSchema = z.object({
  challengeId: z.string().uuid(),
  factor: z.string().trim().min(1).optional(),
  code: z.string().trim().min(1),
});

async function persistAuthSession(
  membershipId: string,
  organizationId: string,
  auth: Awaited<ReturnType<typeof goldenDuskAgentVerifyMfa>>,
  challengeId: string,
) {
  await saveGoldenDuskAgentConnection({
    membershipId,
    organizationId,
    auth,
  });
  await clearGoldenDuskAuthChallenge(membershipId, challengeId);
  revalidatePath("/agent/settings");
  revalidatePath("/agent/products");
}

export async function getGoldenDuskAgentConnectionAction() {
  const agent = await requireAgentContext();
  if (!agent) return { connected: false as const };
  return getGoldenDuskConnectionSummary(agent.membership.id, {
    includeLiveProfile: true,
  });
}

export async function refreshGoldenDuskAgentProfileAction() {
  const agent = await requireAgentContext();
  if (!agent) throw new Error("Agent access is required.");

  const profile = await syncGoldenDuskConnectionProfile(agent.membership.id);
  if (!profile) {
    throw new Error("Connect GoldenDusk first or your session may have expired.");
  }

  revalidatePath("/agent/settings");
  return { ok: true as const, profile };
}

export async function startGoldenDuskAgentLogin(input: unknown) {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) {
    throw new Error("Agent access is required.");
  }

  const parsed = loginSchema.parse(input);
  try {
    const result = await goldenDuskAgentLogin(parsed.email, parsed.password);
    if (!result.mfaChallengeToken) {
      throw new Error(
        result.message || "GoldenDusk did not return an MFA challenge.",
      );
    }

    const nextStep = resolveGoldenDuskLoginNextStep(result);
    const challenge = await createGoldenDuskAuthChallenge(agent.membership.id, {
      challengeToken: result.mfaChallengeToken,
      factors: result.factors ?? (nextStep === "mfa_setup" ? [] : ["totp"]),
    });

    return {
      challengeId: challenge.challengeId,
      factors: challenge.factors,
      nextStep,
      message: result.message,
      email: parsed.email,
    };
  } catch (error) {
    if (error instanceof GoldenDuskApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function beginGoldenDuskMfaSetup(challengeId: string) {
  const agent = await requireAgentContext();
  if (!agent) throw new Error("Agent access is required.");

  const challenge = await getGoldenDuskAuthChallenge(
    agent.membership.id,
    challengeId,
  );

  try {
    const setup = await goldenDuskAgentMfaSetup(challenge.challengeToken);
    return {
      otpAuthUri: setup.otpAuthUri,
      secret: setup.secret,
      issuer: setup.issuer,
      account: setup.account,
    };
  } catch (error) {
    if (error instanceof GoldenDuskApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function sendGoldenDuskAgentEmailOtp(challengeId: string) {
  const agent = await requireAgentContext();
  if (!agent) throw new Error("Agent access is required.");

  const challenge = await getGoldenDuskAuthChallenge(
    agent.membership.id,
    challengeId,
  );
  try {
    await goldenDuskAgentSendEmailOtp(challenge.challengeToken);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof GoldenDuskApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function verifyGoldenDuskAgentMfa(input: unknown) {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) {
    throw new Error("Agent access is required.");
  }

  const parsed = mfaSchema.parse(input);
  const challenge = await getGoldenDuskAuthChallenge(
    agent.membership.id,
    parsed.challengeId,
  );

  try {
    const auth = await goldenDuskAgentVerifyMfa({
      challengeToken: challenge.challengeToken,
      factor: parsed.factor ?? challenge.factors[0] ?? "totp",
      code: parsed.code,
    });

    await persistAuthSession(
      agent.membership.id,
      agent.membership.organizationId,
      auth,
      parsed.challengeId,
    );

    return {
      ok: true as const,
      agencyName: auth.agencyName,
      email: auth.email,
      recoveryCodes: auth.recoveryCodes ?? [],
    };
  } catch (error) {
    if (error instanceof GoldenDuskApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function confirmGoldenDuskMfaSetup(input: unknown) {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) {
    throw new Error("Agent access is required.");
  }

  const parsed = mfaSchema.parse(input);
  const challenge = await getGoldenDuskAuthChallenge(
    agent.membership.id,
    parsed.challengeId,
  );

  try {
    const auth = await goldenDuskAgentMfaConfirm({
      challengeToken: challenge.challengeToken,
      code: parsed.code,
    });

    await persistAuthSession(
      agent.membership.id,
      agent.membership.organizationId,
      auth,
      parsed.challengeId,
    );

    return {
      ok: true as const,
      agencyName: auth.agencyName,
      email: auth.email,
      recoveryCodes: auth.recoveryCodes ?? [],
    };
  } catch (error) {
    if (error instanceof GoldenDuskApiError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function disconnectGoldenDuskAgentAction() {
  const agent = await requireAgentContext();
  if (!agent) throw new Error("Agent access is required.");

  await disconnectGoldenDuskAgent(agent.membership.id);
  revalidatePath("/agent/settings");
  revalidatePath("/agent/products");
  return { ok: true as const };
}
