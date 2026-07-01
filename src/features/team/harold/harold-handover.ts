import type { HandoverDomain } from "./handover-routing";
import { inferHandoverDomain } from "./handover-routing";

export const HANDOVER_SYSTEM_MESSAGE =
  "I'm handing this conversation to the Shearwater team. An available team member will receive a notification with full context and continue with you shortly.";

export const HANDOVER_CLAIMED_MESSAGE =
  "Your Shearwater specialist has joined. They have the full conversation history and will help you from here.";

export function replyImpliesHandover(reply: string | null | undefined) {
  if (!reply) return false;
  return /hand(?:ing|ed)?\s+(?:this\s+)?(?:conversation\s+)?over|passing\s+(?:you|this)\s+to|connect(?:ing)?\s+you\s+with|(?:a\s+)?(?:team|human)\s+member\s+will|(?:our\s+)?team\s+will|(?:be|get)\s+with\s+you\s+shortly|someone\s+from\s+(?:the\s+)?team|human\s+(?:assistance|support)/i.test(
    reply,
  );
}

export function resolveHandoverDomain(input: {
  sourceAccess: "team" | "agent" | "customer";
  reason?: string | null;
  message?: string | null;
  webhookDomain?: HandoverDomain | null;
}): HandoverDomain {
  if (input.sourceAccess === "customer" || input.sourceAccess === "agent") {
    return "guest_relations";
  }
  if (input.webhookDomain) return input.webhookDomain;
  return inferHandoverDomain({
    sourceAccess: input.sourceAccess,
    reason: input.reason,
    message: input.message,
  });
}

export async function applyHaroldHandover(
  admin: ReturnType<typeof import("@/lib/supabase/admin").createAdminClient>,
  input: {
    conversationId: string;
    organizationId: string;
    sourceAccess: "team" | "agent" | "customer";
    reason: string;
    userMessage?: string | null;
    webhookDomain?: HandoverDomain | null;
    includeSystemMessage: boolean;
  },
) {
  const handoverDomain = resolveHandoverDomain({
    sourceAccess: input.sourceAccess,
    reason: input.reason,
    message: input.userMessage,
    webhookDomain: input.webhookDomain,
  });

  const { error } = await (admin as any)
    .from("harold_conversations")
    .update({
      status: "handover_requested",
      handover_requested_at: new Date().toISOString(),
      handover_requested_by: "ai",
      handover_reason: input.reason,
      handover_domain: handoverDomain,
      assigned_to_membership_id: null,
      resolved_at: null,
    })
    .eq("id", input.conversationId)
    .eq("organization_id", input.organizationId);
  if (error) throw new Error(error.message);

  if (!input.includeSystemMessage) return null;

  const { data, error: systemError } = await admin
    .from("harold_messages")
    .insert({
      conversation_id: input.conversationId,
      role: "system",
      content: HANDOVER_SYSTEM_MESSAGE,
      metadata: { reason: input.reason, handoverDomain },
    })
    .select("id,created_at")
    .single();
  if (systemError) throw new Error(systemError.message);
  return data;
}
