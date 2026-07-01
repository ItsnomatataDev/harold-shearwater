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

export interface HaroldWebhookModuleContext {
  /** Module id, e.g. "crm", "products", "bookings". */
  id: string;
  /** Human label, e.g. "CRM". */
  label?: string;
  /** What Harold can help with in this module. */
  capabilities?: string[];
  /** Type of record currently in focus, e.g. "customer_profile". */
  recordType?: string;
  recordId?: string;
  /** Short human-readable description of what the user is looking at. */
  summary?: string;
  /** Structured, sanitized snapshot of what is visible on screen. */
  data?: Record<string, unknown>;
}

export function isHaroldWebhookConfigured() {
  const value = process.env.N8N_HAROLD_WEBHOOK;
  if (!value) return false;
  return z.url().safeParse(value).success;
}

export async function sendToHaroldWebhook(input: {
  conversationId: string;
  organizationId: string;
  organizationName: string | null;
  user: { id: string; name: string; access: "team" | "agent" | "customer" };
  message: { id: string; content: string; createdAt: string };
  history: WebhookMessage[];
  /** Optional: where in the system this request originated. */
  module?: HaroldWebhookModuleContext;
  /** "conversation" (persisted chat) or "assistant" (ephemeral module help). */
  mode?: "conversation" | "assistant";
}): Promise<HaroldWebhookResult> {
  const webhookUrl = z.url().parse(process.env.N8N_HAROLD_WEBHOOK);
  const liveAvailability = input.module?.data?.liveAvailability as
    | { assistantBrief?: string; model?: unknown; summary?: string; days?: unknown }
    | undefined;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: "harold.message",
      version: "2.1",
      mode: input.mode ?? "conversation",
      source: `${input.user.access}_access`,
      conversationId: input.conversationId,
      organization: {
        id: input.organizationId,
        name: input.organizationName,
      },
      user: input.user,
      module: input.module ?? null,
      /** Pre-written context for n8n — inject into the AI system prompt. */
      assistantContext: liveAvailability?.assistantBrief ?? null,
      availability: liveAvailability
        ? {
            model: liveAvailability.model,
            summary: liveAvailability.summary,
            days: liveAvailability.days,
          }
        : null,
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
