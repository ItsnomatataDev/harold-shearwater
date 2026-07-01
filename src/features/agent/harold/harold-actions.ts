"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import {
  isHaroldWebhookConfigured,
  sendToHaroldWebhook,
} from "@/features/team/harold/harold-webhook";
import type {
  HaroldConversationStatus,
  HaroldMessage,
} from "@/features/team/harold/harold-service";
import { inferHandoverDomain } from "@/features/team/harold/handover-routing";
import {
  applyHaroldHandover,
  HANDOVER_SYSTEM_MESSAGE,
  replyImpliesHandover,
} from "@/features/team/harold/harold-handover";
import { augmentHaroldModuleWithAvailability } from "@/features/harold/harold-availability-context";

const messageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(10_000),
});

const handoverSchema = z.object({
  conversationId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

async function guardAgentOrg(organizationId: string) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    throw new Error("Agent Access is required.");
  }
  return agent;
}

export async function sendAgentHaroldMessage(
  organizationId: string,
  input: unknown,
) {
  const parsed = messageSchema.parse(input);
  const agent = await guardAgentOrg(organizationId);
  const supabase = await createClient();
  let conversationId = parsed.conversationId;
  let status: HaroldConversationStatus = "ai_active";

  if (conversationId) {
    const { data, error } = await supabase
      .from("harold_conversations")
      .select("id,status")
      .eq("id", conversationId)
      .eq("organization_id", organizationId)
      .eq("user_id", agent.context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Conversation not found.");
    status = data.status as HaroldConversationStatus;
    if (status === "resolved") {
      throw new Error("This conversation is resolved. Start a new one.");
    }
  } else {
    const { data, error } = await supabase
      .from("harold_conversations")
      .insert({
        organization_id: organizationId,
        user_id: agent.context.userId,
        source_access: "agent",
        title: parsed.message.slice(0, 60),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    conversationId = data.id;
  }

  const { data: userMessageRow, error: messageError } = await supabase
    .from("harold_messages")
    .insert({
      conversation_id: conversationId,
      role: "user",
      content: parsed.message,
      author_user_id: agent.context.userId,
    })
    .select("id,created_at")
    .single();
  if (messageError) throw new Error(messageError.message);

  const userMessage: HaroldMessage = {
    id: userMessageRow.id,
    conversationId,
    role: "user",
    content: parsed.message,
    authorName: agent.context.fullName,
    createdAt: userMessageRow.created_at,
  };

  if (status !== "ai_active") {
    revalidatePath("/agent/harold");
    revalidatePath("/team/communication/handovers");
    return { conversationId, messages: [userMessage], status, aiError: null };
  }

  if (!isHaroldWebhookConfigured()) {
    revalidatePath("/agent/harold");
    return {
      conversationId,
      messages: [userMessage],
      status,
      aiError: "Harold webhook is not configured.",
    };
  }

  const historyResult = await supabase
    .from("harold_messages")
    .select("role,content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (historyResult.error) throw new Error(historyResult.error.message);

  try {
    const moduleContext = await augmentHaroldModuleWithAvailability(
      {
        id: "agent_harold",
        label: "Agent Harold Chat",
        summary: "Agent is chatting with Harold about clients, products and availability.",
      },
      parsed.message,
    );

    const webhookResult = await sendToHaroldWebhook({
      conversationId,
      organizationId,
      organizationName: agent.membership.organizationName,
      user: {
        id: agent.context.userId,
        name: agent.context.fullName,
        access: "agent",
      },
      module: moduleContext,
      message: {
        id: userMessage.id,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      },
      history: (historyResult.data ?? []).reverse().map((item) => ({
        role: item.role as "user" | "assistant" | "human" | "system",
        content: item.content,
      })),
    });

    const admin = createAdminClient();
    const responseMessages: HaroldMessage[] = [];

    if (webhookResult.reply) {
      const { data, error } = await admin
        .from("harold_messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: webhookResult.reply,
          metadata: { source: "n8n" },
        })
        .select("id,created_at")
        .single();
      if (error) throw new Error(error.message);
      responseMessages.push({
        id: data.id,
        conversationId,
        role: "assistant",
        content: webhookResult.reply,
        authorName: "Harold",
        createdAt: data.created_at,
      });
    }

    const shouldHandover =
      webhookResult.handover || replyImpliesHandover(webhookResult.reply);

    if (shouldHandover) {
      const reason =
        webhookResult.handoverReason ?? "Harold requested human assistance.";
      const systemRow = await applyHaroldHandover(admin, {
        conversationId,
        organizationId,
        sourceAccess: "agent",
        reason,
        userMessage: parsed.message,
        webhookDomain: webhookResult.handoverDomain,
        includeSystemMessage: !webhookResult.reply,
      });
      status = "handover_requested";
      if (systemRow) {
        responseMessages.push({
          id: systemRow.id,
          conversationId,
          role: "system",
          content: HANDOVER_SYSTEM_MESSAGE,
          authorName: "System",
          createdAt: systemRow.created_at,
        });
      }
    }

    if (!webhookResult.reply && !shouldHandover) {
      return {
        conversationId,
        messages: [userMessage],
        status,
        aiError: "Harold’s workflow returned no reply.",
      };
    }

    revalidatePath("/agent/harold");
    revalidatePath("/team/communication/handovers");
    return {
      conversationId,
      messages: [userMessage, ...responseMessages],
      status,
      aiError: null,
    };
  } catch (err) {
    revalidatePath("/agent/harold");
    return {
      conversationId,
      messages: [userMessage],
      status,
      aiError:
        err instanceof Error ? err.message : "Harold is unavailable right now.",
    };
  }
}

export async function requestAgentHumanHandover(
  organizationId: string,
  input: unknown,
) {
  const parsed = handoverSchema.parse(input);
  await guardAgentOrg(organizationId);
  const supabase = await createClient();
  const handoverDomain = inferHandoverDomain({
    sourceAccess: "agent",
    reason: parsed.reason ?? "The agent requested help from the Shearwater team.",
  });
  const { error } = await (supabase as any).rpc("request_harold_handover", {
    target_conversation_id: parsed.conversationId,
    requested_reason:
      parsed.reason || "The agent requested help from the Shearwater team.",
    requested_domain: handoverDomain,
  });
  if (error) throw new Error(error.message);

  const { error: messageError } = await createAdminClient()
    .from("harold_messages")
    .insert({
      conversation_id: parsed.conversationId,
      role: "system",
      content:
        "Human assistance requested. A Shearwater team member can now take over this conversation.",
      metadata: { requestedBy: "agent" },
    });
  if (messageError) throw new Error(messageError.message);

  revalidatePath("/agent/harold");
  revalidatePath("/team/communication/handovers");
}
