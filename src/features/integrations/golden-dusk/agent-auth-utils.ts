import type {
  GoldenDuskAgentLoginResult,
  GoldenDuskLoginNextStep,
} from "./agent-auth-types";

export function resolveGoldenDuskLoginNextStep(
  result: GoldenDuskAgentLoginResult,
): GoldenDuskLoginNextStep {
  const status = result.status?.toLowerCase() ?? "";
  if (
    status.includes("setup") ||
    status.includes("enroll") ||
    status.includes("register")
  ) {
    return "mfa_setup";
  }
  return "mfa_verify";
}

export const GOLDEN_DUSK_MFA_FACTOR_LABELS: Record<string, string> = {
  totp: "Authenticator app",
  email: "Email code",
  recovery: "Recovery code",
};
