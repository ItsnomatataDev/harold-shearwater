import "server-only";

import { z } from "zod";
import {
  normalizeHaroldWebhookResponse,
  type HaroldWebhookResult,
} from "./harold-webhook-contract";

const webhookResponseSchema = z.unknown();

type WebhookMessage = {
  role: "user" | "assistant" | "human" | "system";
  content: string;
};

export function isHaroldWebhookConfigured() {
  const value = process.env.N8N_HAROLD_WEBHOOK;
  if (!value) return false;
  return z.url().safeParse(value).success;
}

export async function sendToHaroldWebhook(input: {
  conversationId: string;
  organizationId: string;
  organizationName: string | null;
  user: { id: string; name: string; access: "team" | "agent" };
  message: { id: string; content: string; createdAt: string };
  history: WebhookMessage[];
}): Promise<HaroldWebhookResult> {
  const webhookUrl = z.url().parse(process.env.N8N_HAROLD_WEBHOOK);
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: "harold.message",
      version: "1.0",
      source: `${input.user.access}_access`,
      conversationId: input.conversationId,
      organization: {
        id: input.organizationId,
        name: input.organizationName,
      },
      user: input.user,
      message: input.message,
      history: input.history,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`Harold webhook returned HTTP ${response.status}.`);
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error("Harold webhook returned an empty response.");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = text;
  }

  return normalizeHaroldWebhookResponse(webhookResponseSchema.parse(raw));
}
