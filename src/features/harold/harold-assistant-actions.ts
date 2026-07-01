"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/features/auth/services/auth-context";
import { getOperatingOrganizationId } from "@/features/products/products-service";
import {
  isHaroldWebhookConfigured,
  sendToHaroldWebhook,
} from "@/features/team/harold/harold-webhook";
import {
  applyHaroldHandover,
  replyImpliesHandover,
} from "@/features/team/harold/harold-handover";
import { getHaroldModule, type HaroldAccess } from "./harold-modules";
import { augmentHaroldModuleWithAvailability } from "./harold-availability-context";

const askSchema = z.object({
  access: z.enum(["team", "agent", "customer"]),
  moduleId: z.string().trim().min(1).max(64),
  message: z.string().trim().min(1).max(10_000),
  recordType: z.string().trim().max(64).optional(),
  recordId: z.string().trim().max(128).optional(),
  summary: z.string().trim().max(2_000).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(10_000),
      }),
    )
    .max(20)
    .optional(),
});

export type HaroldAssistantReply = {
  reply: string | null;
  handover: boolean;
  handoverReason: string | null;
  handoverRequested: boolean;
  conversationId: string | null;
  continueHref: string | null;
  intent: string | null;
  confidence: number | null;
  languageQuality: "clear" | "unclear" | "poor" | null;
  suggestedActions: Array<{ type: string; label: string }>;
  error: string | null;
};

function haroldChatHref(access: HaroldAccess, conversationId: string) {
  switch (access) {
    case "agent":
      return `/agent/harold?conversation=${conversationId}`;
    case "customer":
      return `/customer/chat?conversation=${conversationId}`;
    default:
      return `/team/harold?conversation=${conversationId}`;
  }
}

function revalidateHandoverPaths(access: HaroldAccess) {
  revalidatePath("/team/communication/handovers");
  if (access === "agent") revalidatePath("/agent/harold");
  if (access === "customer") {
    revalidatePath("/customer/chat");
    revalidatePath("/customer/messages");
  }
  if (access === "team") revalidatePath("/team/harold");
}

async function resolveAssistant(access: HaroldAccess) {
  const context = await getAuthContext();
  if (!context) throw new Error("You must be signed in to use Harold.");

  const membership = context.memberships.find(
    (item) => item.accessType === access,
  );
  if (!membership) throw new Error("Harold is not available for this access.");

  const organizationId =
    access === "customer"
      ? await getOperatingOrganizationId()
      : membership.organizationId;

  if (!organizationId) {
    throw new Error("Harold is not configured for this workspace yet.");
  }

  return {
    context,
    organizationId,
    organizationName:
      access === "customer"
        ? "Shearwater Victoria Falls"
        : membership.organizationName,
    membershipId: membership.id,
  };
}

async function persistAssistantHandover(input: {
  access: HaroldAccess;
  organizationId: string;
  userId: string;
  message: string;
  reply: string | null;
  handoverReason: string | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("harold_conversations")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      source_access: input.access,
      title: input.message.slice(0, 60),
    })
    .select("id")
    .single();
  if (conversationError) throw new Error(conversationError.message);

  const conversationId = conversation.id;
  const messageRows: Array<{
    conversation_id: string;
    role: "user" | "assistant";
    content: string;
    author_user_id?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  for (const turn of input.history ?? []) {
    messageRows.push({
      conversation_id: conversationId,
      role: turn.role,
      content: turn.content,
      author_user_id: turn.role === "user" ? input.userId : undefined,
      metadata: turn.role === "assistant" ? { source: "n8n", via: "assistant" } : undefined,
    });
  }

  if (!messageRows.some((row) => row.role === "user" && row.content === input.message)) {
    messageRows.push({
      conversation_id: conversationId,
      role: "user",
      content: input.message,
      author_user_id: input.userId,
    });
  }

  if (input.reply) {
    messageRows.push({
      conversation_id: conversationId,
      role: "assistant",
      content: input.reply,
      metadata: { source: "n8n", via: "assistant" },
    });
  }

  if (messageRows.length) {
    const { error: historyError } = await admin
      .from("harold_messages")
      .insert(messageRows as never);
    if (historyError) throw new Error(historyError.message);
  }

  const reason =
    input.handoverReason ?? "Harold requested human assistance.";
  await applyHaroldHandover(admin, {
    conversationId,
    organizationId: input.organizationId,
    sourceAccess: input.access,
    reason,
    userMessage: input.message,
    webhookDomain: null,
    includeSystemMessage: !input.reply,
  });

  revalidateHandoverPaths(input.access);
  return conversationId;
}

/**
 * Module-aware Harold help from the launcher drawer. When Harold signals a
 * handover, a real conversation is created and queued for any available team
 * member — not just shown in the ephemeral drawer.
 */
export async function askHaroldAssistant(
  input: unknown,
): Promise<HaroldAssistantReply> {
  const parsed = askSchema.parse(input);

  const empty: HaroldAssistantReply = {
    reply: null,
    handover: false,
    handoverReason: null,
    handoverRequested: false,
    conversationId: null,
    continueHref: null,
    intent: null,
    confidence: null,
    languageQuality: null,
    suggestedActions: [],
    error: null,
  };

  if (!isHaroldWebhookConfigured()) {
    return { ...empty, error: "Harold’s n8n webhook is not configured yet." };
  }

  let resolved;
  try {
    resolved = await resolveAssistant(parsed.access);
  } catch (cause) {
    return {
      ...empty,
      error:
        cause instanceof Error ? cause.message : "Harold is unavailable.",
    };
  }

  const moduleDef = getHaroldModule(parsed.moduleId);

  try {
    const moduleContext = await augmentHaroldModuleWithAvailability(
      {
        id: parsed.moduleId,
        label: moduleDef?.label,
        capabilities: moduleDef?.capabilities,
        recordType: parsed.recordType,
        recordId: parsed.recordId,
        summary: parsed.summary ?? moduleDef?.description,
        data: parsed.data,
      },
      parsed.message,
      parsed.access === "agent"
        ? { membershipId: resolved.membershipId }
        : undefined,
    );

    const result = await sendToHaroldWebhook({
      conversationId: randomUUID(),
      organizationId: resolved.organizationId,
      organizationName: resolved.organizationName,
      mode: "assistant",
      user: {
        id: resolved.context.userId,
        name: resolved.context.fullName,
        access: parsed.access,
      },
      module: moduleContext,
      message: {
        id: randomUUID(),
        content: parsed.message,
        createdAt: new Date().toISOString(),
      },
      history: parsed.history ?? [],
    });

    const shouldHandover =
      result.handover || replyImpliesHandover(result.reply);
    let conversationId: string | null = null;

    if (shouldHandover) {
      conversationId = await persistAssistantHandover({
        access: parsed.access,
        organizationId: resolved.organizationId,
        userId: resolved.context.userId,
        message: parsed.message,
        reply: result.reply,
        handoverReason: result.handoverReason,
        history: parsed.history,
      });
    }

    return {
      reply: result.reply,
      handover: shouldHandover,
      handoverReason: result.handoverReason,
      handoverRequested: shouldHandover,
      conversationId,
      continueHref: conversationId
        ? haroldChatHref(parsed.access, conversationId)
        : null,
      intent: result.intent,
      confidence: result.confidence,
      languageQuality: result.languageQuality,
      suggestedActions: result.suggestedActions,
      error: result.reply || shouldHandover ? null : "Harold returned no reply.",
    };
  } catch (cause) {
    return {
      ...empty,
      error:
        cause instanceof Error
          ? cause.message
          : "Harold could not reach the workflow.",
    };
  }
}
