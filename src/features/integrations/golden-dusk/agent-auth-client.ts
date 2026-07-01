import "server-only";

import { getGoldenDuskApiBaseUrl, GoldenDuskApiError } from "./client";
import type {
  GoldenDuskActivationTokenValidation,
  GoldenDuskAgentAuthResult,
  GoldenDuskAgentLoginResult,
  GoldenDuskAgentMe,
  GoldenDuskMfaSetupResult,
} from "./agent-auth-types";

function normalizeGoldenDuskEnvelope(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return { isSuccess: null as boolean | null, message: null as string | null, data: null };
  }
  const record = payload as Record<string, unknown>;
  const rawSuccess = record.isSuccess ?? record.IsSuccess;
  const rawMessage = record.message ?? record.Message;
  const data = record.data ?? record.Data ?? null;
  return {
    isSuccess: typeof rawSuccess === "boolean" ? rawSuccess : null,
    message: typeof rawMessage === "string" ? rawMessage : null,
    data,
  };
}

async function parseEnvelope<T>(response: Response, url: string): Promise<T> {
  const payload = await response.json().catch(() => null);
  const envelope = normalizeGoldenDuskEnvelope(payload);

  if (!response.ok) {
    throw new GoldenDuskApiError(
      envelope.message || `GoldenDusk agent request failed (${response.status})`,
      response.status,
      url,
    );
  }

  if (envelope.isSuccess === null) {
    throw new GoldenDuskApiError(
      "Unexpected GoldenDusk agent response.",
      response.status,
      url,
    );
  }

  if (!envelope.isSuccess) {
    throw new GoldenDuskApiError(
      envelope.message || "GoldenDusk agent request returned isSuccess=false",
      response.status,
      url,
    );
  }

  return envelope.data as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response: Response) {
  const header = response.headers.get("retry-after")?.trim();
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 30_000);
  }
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.min(Math.max(dateMs - Date.now(), 0), 30_000);
  }
  return null;
}

async function agentFetchWithRetry(
  url: string,
  init: RequestInit,
  retryOnRateLimit: boolean,
): Promise<Response> {
  const maxAttempts = retryOnRateLimit ? 3 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, { ...init, cache: "no-store" });

    if (
      response.status === 429 &&
      retryOnRateLimit &&
      attempt < maxAttempts
    ) {
      const retryAfterMs =
        parseRetryAfterMs(response) ?? Math.min(2000 * 2 ** (attempt - 1), 8000);
      await sleep(retryAfterMs);
      continue;
    }

    return response;
  }

  throw new GoldenDuskApiError("GoldenDusk agent request failed (429)", 429, url);
}

async function agentPost<T>(
  path: string,
  body: unknown,
  token?: string,
  options?: { retryOnRateLimit?: boolean },
): Promise<T> {
  const baseUrl = getGoldenDuskApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const retryOnRateLimit = options?.retryOnRateLimit ?? false;
  const response = await agentFetchWithRetry(
    url,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    },
    retryOnRateLimit,
  );

  return parseEnvelope<T>(response, url);
}

export async function goldenDuskAgentLogin(email: string, password: string) {
  return agentPost<GoldenDuskAgentLoginResult>(
    "/agent/auth/login",
    { email, password },
    undefined,
    { retryOnRateLimit: true },
  );
}

export async function goldenDuskAgentVerifyMfa(input: {
  challengeToken: string;
  factor: string;
  code: string;
}) {
  return agentPost<GoldenDuskAgentAuthResult>(
    "/agent/auth/mfa/verify",
    {
      challengeToken: input.challengeToken,
      factor: input.factor,
      code: input.code,
    },
    undefined,
    { retryOnRateLimit: true },
  );
}

export async function goldenDuskAgentSendEmailOtp(challengeToken: string) {
  return agentPost<boolean>(
    "/agent/auth/mfa/send-email-otp",
    { challengeToken },
    undefined,
    { retryOnRateLimit: true },
  );
}

export async function goldenDuskAgentRefreshToken(refreshToken: string) {
  return agentPost<GoldenDuskAgentAuthResult>("/agent/auth/refresh-token", {
    token: refreshToken,
  });
}

export async function goldenDuskAgentRevokeToken(refreshToken: string) {
  return agentPost<unknown>("/agent/auth/revoke-token", {
    token: refreshToken,
  });
}

export async function goldenDuskAgentMfaSetup(challengeToken: string) {
  return agentPost<GoldenDuskMfaSetupResult>(
    "/agent/auth/mfa/setup",
    { challengeToken },
    undefined,
    { retryOnRateLimit: true },
  );
}

export async function goldenDuskAgentMfaConfirm(input: {
  challengeToken: string;
  code: string;
}) {
  return agentPost<GoldenDuskAgentAuthResult>(
    "/agent/auth/mfa/confirm",
    {
      challengeToken: input.challengeToken,
      code: input.code,
    },
    undefined,
    { retryOnRateLimit: true },
  );
}

export async function goldenDuskAgentForgotPassword(email: string) {
  return agentPost<boolean>("/agent/auth/forgot-password", { email });
}

export async function goldenDuskAgentResetPassword(input: {
  token: string;
  password: string;
  confirmPassword: string;
}) {
  return agentPost<boolean>("/agent/auth/reset-password", input);
}

export async function goldenDuskAgentRegister(input: {
  agencyId: number;
  agencyName?: string;
  agencyConsultantId?: number;
  firstName: string;
  surname: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  return agentPost<boolean>("/agent/auth/register", input);
}

export async function goldenDuskAgentValidateActivationToken(token: string) {
  const baseUrl = getGoldenDuskApiBaseUrl();
  const url = `${baseUrl}/agent/auth/validate-activation-token`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
    cache: "no-store",
  });
  const result = await parseEnvelope<GoldenDuskActivationTokenValidation>(
    response,
    url,
  );
  if (!result?.valid) {
    throw new GoldenDuskApiError(
      result?.expired
        ? "This activation link has expired. Ask Shearwater to resend activation."
        : "Invalid or expired activation token. Open the link from your GoldenDusk activation email — do not use your email address here.",
      400,
      url,
    );
  }
  return result;
}

export async function goldenDuskAgentActivate(input: {
  token: string;
  password: string;
}) {
  return agentPost<boolean>("/agent/auth/activate", input);
}

export async function goldenDuskAgentMe(token: string) {
  return goldenDuskAgentFetch<GoldenDuskAgentMe>("/agent/auth/me", { token });
}

export async function goldenDuskAgentFetch<T>(
  path: string,
  init?: {
    method?: "GET" | "POST" | "PUT";
    body?: unknown;
    token: string;
    retryOnRateLimit?: boolean;
  },
): Promise<T> {
  const baseUrl = getGoldenDuskApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const retryOnRateLimit = init?.retryOnRateLimit ?? true;
  const response = await agentFetchWithRetry(
    url,
    {
      method: init?.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${init?.token}`,
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    },
    retryOnRateLimit,
  );
  return parseEnvelope<T>(response, url);
}

export async function goldenDuskAgentDownload(
  path: string,
  token: string,
): Promise<{ contentType: string; buffer: ArrayBuffer; fileName: string | null }> {
  const baseUrl = getGoldenDuskApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/pdf,application/octet-stream,*/*",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";

  if (!response.ok) {
    if (contentType.includes("application/json")) {
      const payload = await response.json().catch(() => null);
      const envelope = normalizeGoldenDuskEnvelope(payload);
      throw new GoldenDuskApiError(
        envelope.message || `GoldenDusk download failed (${response.status})`,
        response.status,
        url,
      );
    }
    throw new GoldenDuskApiError(
      `GoldenDusk download failed (${response.status})`,
      response.status,
      url,
    );
  }

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    const envelope = normalizeGoldenDuskEnvelope(payload);
    if (!envelope.isSuccess) {
      throw new GoldenDuskApiError(
        envelope.message || "GoldenDusk download returned isSuccess=false",
        response.status,
        url,
      );
    }
    const data = envelope.data as Record<string, unknown> | null;
    const base64 =
      (typeof data?.fileContents === "string" && data.fileContents) ||
      (typeof data?.content === "string" && data.content) ||
      null;
    if (!base64) {
      throw new GoldenDuskApiError(
        "GoldenDusk document response did not include file content.",
        response.status,
        url,
      );
    }
    const buffer = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
      .buffer;
    return {
      contentType:
        (typeof data?.contentType === "string" && data.contentType) ||
        "application/pdf",
      buffer,
      fileName:
        (typeof data?.fileName === "string" && data.fileName) ||
        (typeof data?.filename === "string" && data.filename) ||
        null,
    };
  }

  const disposition = response.headers.get("content-disposition");
  const fileName =
    disposition?.match(/filename="?([^";]+)"?/i)?.[1]?.trim() ?? null;

  return {
    contentType,
    buffer: await response.arrayBuffer(),
    fileName,
  };
}
