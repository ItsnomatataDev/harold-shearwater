"use server";

import { GoldenDuskApiError } from "@/features/integrations/golden-dusk/client";
import {
  goldenDuskAgentActivate,
  goldenDuskAgentForgotPassword,
  goldenDuskAgentRegister,
  goldenDuskAgentResetPassword,
  goldenDuskAgentValidateActivationToken,
} from "@/features/integrations/golden-dusk/agent-auth-client";
import { z } from "zod";

function mapError(error: unknown) {
  if (error instanceof GoldenDuskApiError) {
    throw new Error(error.message);
  }
  throw error;
}

const forgotSchema = z.object({
  email: z.string().trim().email(),
});

const activationTokenSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !value.includes("@"), {
    message:
      "Use the token from your GoldenDusk email link, not your email address.",
  });

const resetSchema = z.object({
  token: activationTokenSchema,
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
});

const registerSchema = z.object({
  agencyId: z.coerce.number().int().positive(),
  agencyName: z.string().trim().max(200).optional(),
  agencyConsultantId: z.coerce.number().int().positive().optional(),
  firstName: z.string().trim().min(1).max(100),
  surname: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().max(2000).optional(),
});

const activateSchema = z.object({
  token: activationTokenSchema,
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
});

export async function requestGoldenDuskPasswordReset(input: unknown) {
  const parsed = forgotSchema.parse(input);
  try {
    await goldenDuskAgentForgotPassword(parsed.email);
    return {
      ok: true as const,
      message:
        "If that email is registered with GoldenDusk, password reset instructions have been sent.",
    };
  } catch (error) {
    mapError(error);
  }
}

export async function resetGoldenDuskPassword(input: unknown) {
  const parsed = resetSchema.parse(input);
  if (parsed.password !== parsed.confirmPassword) {
    throw new Error("Passwords do not match.");
  }
  try {
    await goldenDuskAgentResetPassword({
      token: parsed.token,
      password: parsed.password,
      confirmPassword: parsed.confirmPassword,
    });
    return { ok: true as const };
  } catch (error) {
    mapError(error);
  }
}

export async function requestGoldenDuskAgentAccess(input: unknown) {
  const parsed = registerSchema.parse(input);
  try {
    await goldenDuskAgentRegister(parsed);
    return {
      ok: true as const,
      message:
        "Your GoldenDusk agent access request was submitted. Shearwater will review and email you when approved.",
    };
  } catch (error) {
    mapError(error);
  }
}

export async function validateGoldenDuskActivationToken(token: string) {
  try {
    await goldenDuskAgentValidateActivationToken(token);
    return { ok: true as const };
  } catch (error) {
    mapError(error);
  }
}

export async function activateGoldenDuskAgentAccount(input: unknown) {
  const parsed = activateSchema.parse(input);
  if (parsed.password !== parsed.confirmPassword) {
    throw new Error("Passwords do not match.");
  }
  try {
    await goldenDuskAgentActivate({
      token: parsed.token,
      password: parsed.password,
    });
    return { ok: true as const };
  } catch (error) {
    mapError(error);
  }
}
