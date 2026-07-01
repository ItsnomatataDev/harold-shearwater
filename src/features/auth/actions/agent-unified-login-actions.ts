"use server";

import { z } from "zod";
import {
  beginAgentUnifiedLoginMfaSetup,
  completeAgentUnifiedLoginMfa,
  confirmAgentUnifiedLoginMfaSetup,
  resolveAgentLoginRedirect,
  sendAgentUnifiedLoginEmailOtp,
  startAgentUnifiedLogin,
} from "@/features/auth/services/agent-unified-login-service";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  nextPath: z.string().optional(),
});

const challengeSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  challengeId: z.string().uuid(),
  nextPath: z.string().optional(),
});

const mfaSchema = challengeSchema.extend({
  code: z.string().trim().min(1),
  factor: z.string().trim().min(1).optional(),
});

export async function startAgentUnifiedLoginAction(input: unknown) {
  const parsed = credentialsSchema.parse(input);
  const result = await startAgentUnifiedLogin(parsed.email, parsed.password);
  if (result.status === "complete") {
    return {
      ...result,
      redirectTo: resolveAgentLoginRedirect(parsed.nextPath),
    };
  }
  return result;
}

export async function beginAgentUnifiedLoginMfaSetupAction(input: unknown) {
  const parsed = challengeSchema.pick({ email: true, challengeId: true }).parse(input);
  return beginAgentUnifiedLoginMfaSetup(parsed.email, parsed.challengeId);
}

export async function sendAgentUnifiedLoginEmailOtpAction(input: unknown) {
  const parsed = challengeSchema.pick({ email: true, challengeId: true }).parse(input);
  return sendAgentUnifiedLoginEmailOtp(parsed.email, parsed.challengeId);
}

export async function completeAgentUnifiedLoginMfaAction(input: unknown) {
  const parsed = mfaSchema.parse(input);
  const result = await completeAgentUnifiedLoginMfa(parsed);
  return {
    ...result,
    redirectTo: resolveAgentLoginRedirect(parsed.nextPath),
  };
}

export async function confirmAgentUnifiedLoginMfaSetupAction(input: unknown) {
  const parsed = mfaSchema.parse(input);
  const result = await confirmAgentUnifiedLoginMfaSetup(parsed);
  return {
    ...result,
    redirectTo: resolveAgentLoginRedirect(parsed.nextPath),
  };
}
