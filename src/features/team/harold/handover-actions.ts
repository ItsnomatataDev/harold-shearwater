"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  hasOrganizationPermission,
  requireTeamContext,
} from "@/features/auth/services/auth-context";

const conversationSchema = z.object({ conversationId: z.string().uuid() });
const replySchema = conversationSchema.extend({
  message: z.string().trim().min(1).max(10_000),
});

async function handoverGuard(organizationId: string) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team Access is required.");
  }
  if (
    !(await hasOrganizationPermission(
      organizationId,
      "harold.handovers.manage",
    ))
  ) {
    throw new Error("You do not have permission to manage Harold handovers.");
  }
  return team;
}

function refreshHandoverPaths() {
  revalidatePath("/team/communication/handovers");
  revalidatePath("/team/harold");
  revalidatePath("/team", "layout");
}

export async function claimHandover(organizationId: string, input: unknown) {
  const parsed = conversationSchema.parse(input);
  const team = await handoverGuard(organizationId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_harold_handover", {
    target_conversation_id: parsed.conversationId,
    target_membership_id: team.membership.id,
  });
  if (error) throw new Error(error.message);

  const { error: messageError } = await createAdminClient()
    .from("harold_messages")
    .insert({
      conversation_id: parsed.conversationId,
      role: "system",
      content: `${team.context.fullName} joined from Team Access.`,
      metadata: { assignedMembershipId: team.membership.id },
    });
  if (messageError) throw new Error(messageError.message);
  refreshHandoverPaths();
}

export async function sendHumanReply(organizationId: string, input: unknown) {
  const parsed = replySchema.parse(input);
  const team = await handoverGuard(organizationId);
  const supabase = await createClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("harold_conversations")
    .select("id,status,assigned_to_membership_id")
    .eq("id", parsed.conversationId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (conversationError) throw new Error(conversationError.message);
  if (
    !conversation ||
    conversation.status !== "human_active" ||
    conversation.assigned_to_membership_id !== team.membership.id
  ) {
    throw new Error("Claim this handover before replying.");
  }

  const { error } = await supabase.from("harold_messages").insert({
    conversation_id: parsed.conversationId,
    role: "human",
    content: parsed.message,
    author_user_id: team.context.userId,
  });
  if (error) throw new Error(error.message);
  refreshHandoverPaths();
}

export async function resolveHandover(organizationId: string, input: unknown) {
  const parsed = conversationSchema.parse(input);
  const team = await handoverGuard(organizationId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("resolve_harold_handover", {
    target_conversation_id: parsed.conversationId,
    target_membership_id: team.membership.id,
  });
  if (error) throw new Error(error.message);

  const { error: messageError } = await createAdminClient()
    .from("harold_messages")
    .insert({
      conversation_id: parsed.conversationId,
      role: "system",
      content: `Conversation resolved by ${team.context.fullName}.`,
      metadata: { resolvedByMembershipId: team.membership.id },
    });
  if (messageError) throw new Error(messageError.message);
  refreshHandoverPaths();
}
