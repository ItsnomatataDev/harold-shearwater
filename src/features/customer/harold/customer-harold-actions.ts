"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { getOperatingOrganizationId } from "@/features/products/products-service";
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

async function guardCustomerHarold() {
  const customer = await requireAccessContext("customer");
  if (!customer) throw new Error("Customer Access is required.");

  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) {
    throw new Error("Shearwater operator organization is not configured.");
  }

  return { customer, organizationId };
}

export async function sendCustomerHaroldMessage(input: unknown) {
  const parsed = messageSchema.parse(input);
  const { customer, organizationId } = await guardCustomerHarold();
  const supabase = await createClient();
  let conversationId = parsed.conversationId;
  let status: HaroldConversationStatus = "ai_active";

  if (conversationId) {
    const { data, error } = await supabase
      .from("harold_conversations")
      .select("id,status")
      .eq("id", conversationId)
      .eq("organization_id", organizationId)
      .eq("user_id", customer.context.userId)
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
        user_id: customer.context.userId,
        source_access: "customer",
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
      author_user_id: customer.context.userId,
    })
    .select("id,created_at")
    .single();
  if (messageError) throw new Error(messageError.message);

  const userMessage: HaroldMessage = {
    id: userMessageRow.id,
    conversationId,
    role: "user",
    content: parsed.message,
    authorName: customer.context.fullName,
    createdAt: userMessageRow.created_at,
  };

  if (status !== "ai_active") {
    revalidatePath("/customer/chat");
    revalidatePath("/customer/messages");
    revalidatePath("/team/communication/handovers");
    return { conversationId, messages: [userMessage], status, aiError: null };
  }

  if (!isHaroldWebhookConfigured()) {
    revalidatePath("/customer/chat");
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
        id: "customer_harold",
        label: "Guest Harold Chat",
        summary: "Guest is chatting with Harold about experiences and availability.",
      },
      parsed.message,
    );

    const webhookResult = await sendToHaroldWebhook({
      conversationId,
      organizationId,
      organizationName: "Shearwater Victoria Falls",
      user: {
        id: customer.context.userId,
        name: customer.context.fullName,
        access: "customer",
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
        sourceAccess: "customer",
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

    revalidatePath("/customer/chat");
    revalidatePath("/team/communication/handovers");
    return {
      conversationId,
      messages: [userMessage, ...responseMessages],
      status,
      aiError: null,
    };
  } catch (err) {
    revalidatePath("/customer/chat");
    return {
      conversationId,
      messages: [userMessage],
      status,
      aiError:
        err instanceof Error ? err.message : "Harold is unavailable right now.",
    };
  }
}

export async function requestCustomerHumanHandover(input: unknown) {
  const parsed = handoverSchema.parse(input);
  await guardCustomerHarold();
  const supabase = await createClient();
  const handoverDomain = inferHandoverDomain({
    sourceAccess: "customer",
    reason: parsed.reason ?? "The guest requested help from the Shearwater team.",
  });
  const { error } = await (supabase as any).rpc("request_harold_handover", {
    target_conversation_id: parsed.conversationId,
    requested_reason:
      parsed.reason || "The guest requested help from the Shearwater team.",
    requested_domain: handoverDomain,
  });
  if (error) throw new Error(error.message);

  const { error: messageError } = await createAdminClient()
    .from("harold_messages")
    .insert({
      conversation_id: parsed.conversationId,
      role: "system",
      content:
        "You asked for a human. A Shearwater team member will join shortly and continue with you in Messages.",
      metadata: { requestedBy: "customer" },
    });
  if (messageError) throw new Error(messageError.message);

  revalidatePath("/customer/chat");
  revalidatePath("/team/communication/handovers");
}
