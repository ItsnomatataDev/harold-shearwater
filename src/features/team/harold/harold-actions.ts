"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import {
  isHaroldWebhookConfigured,
  sendToHaroldWebhook,
} from "./harold-webhook";
import type { HaroldConversationStatus, HaroldMessage } from "./harold-service";
import { inferHandoverDomain } from "./handover-routing";
import {
  applyHaroldHandover,
  replyImpliesHandover,
} from "./harold-handover";
import { augmentHaroldModuleWithAvailability } from "@/features/harold/harold-availability-context";

const messageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(10_000),
});

const handoverSchema = z.object({
  conversationId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

async function guardOrganization(organizationId: string) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team Access is required.");
  }
  return team;
}

export async function sendHaroldMessage(
  organizationId: string,
  input: unknown,
) {
  const parsed = messageSchema.parse(input);
  const team = await guardOrganization(organizationId);
  const supabase = await createClient();
  let conversationId = parsed.conversationId;
  let status: HaroldConversationStatus = "ai_active";

  if (conversationId) {
    const { data, error } = await supabase
      .from("harold_conversations")
      .select("id,status")
      .eq("id", conversationId)
      .eq("organization_id", organizationId)
      .eq("user_id", team.context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Conversation not found.");
    status = data.status as HaroldConversationStatus;
    if (status === "resolved") {
      throw new Error(
        "This conversation is resolved. Start a new conversation to continue.",
      );
    }
  } else {
    const { data, error } = await supabase
      .from("harold_conversations")
      .insert({
        organization_id: organizationId,
        user_id: team.context.userId,
        source_access: "team",
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
      author_user_id: team.context.userId,
    })
    .select("id,created_at")
    .single();
  if (messageError) throw new Error(messageError.message);

  const userMessage: HaroldMessage = {
    id: userMessageRow.id,
    conversationId,
    role: "user",
    content: parsed.message,
    authorName: team.context.fullName,
    createdAt: userMessageRow.created_at,
  };

  if (status !== "ai_active") {
    revalidatePath("/team/harold");
    revalidatePath("/team/communication/handovers");
    return {
      conversationId,
      messages: [userMessage],
      status,
      aiError: null,
    };
  }

  if (!isHaroldWebhookConfigured()) {
    return {
      conversationId,
      messages: [userMessage],
      status,
      aiError: "Harold’s n8n webhook is not configured.",
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
        id: "team_harold",
        label: "Team Harold Chat",
        summary: "Team member is chatting with Harold.",
      },
      parsed.message,
    );

    const webhookResult = await sendToHaroldWebhook({
      conversationId,
      organizationId,
      organizationName: team.membership.organizationName,
      user: {
        id: team.context.userId,
        name: team.context.fullName,
        access: "team",
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
        webhookResult.handoverReason ??
        "Harold requested human assistance.";
      const systemRow = await applyHaroldHandover(admin, {
        conversationId,
        organizationId,
        sourceAccess: "team",
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
          content:
            "Harold has handed this conversation to the Shearwater team.",
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

    revalidatePath("/team/harold");
    revalidatePath("/team/communication/handovers");
    return {
      conversationId,
      messages: [userMessage, ...responseMessages],
      status,
      aiError: null,
    };
  } catch (cause) {
    return {
      conversationId,
      messages: [userMessage],
      status,
      aiError:
        cause instanceof Error
          ? cause.message
          : "Harold could not reach the n8n workflow.",
    };
  }
}

export async function requestHumanHandover(
  organizationId: string,
  input: unknown,
) {
  const parsed = handoverSchema.parse(input);
  await guardOrganization(organizationId);
  const supabase = await createClient();
  const handoverDomain = inferHandoverDomain({
    sourceAccess: "team",
    reason: parsed.reason,
  });
  const { error } = await (supabase as any).rpc("request_harold_handover", {
    target_conversation_id: parsed.conversationId,
    requested_reason: parsed.reason,
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
      metadata: { reason: parsed.reason ?? null },
    });
  if (messageError) throw new Error(messageError.message);

  revalidatePath("/team/harold");
  revalidatePath("/team/communication/handovers");
}
