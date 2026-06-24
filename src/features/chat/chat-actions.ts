"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/features/auth/services/auth-context";
import { createClient } from "@/lib/supabase/server";

export async function startDirectConversation(membershipId: string) {
  const targetMembershipId = z.string().uuid().parse(membershipId);
  const { data, error } = await (await createClient()).rpc("start_direct_chat", {
    target_membership_id: targetMembershipId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/team/chat");
  return data;
}

export async function sendChatMessage(conversationId: string, accessType: "team" | "agent" | "customer", body: string) {
  const context = await getAuthContext();
  if (!context?.memberships.some((membership) => membership.accessType === accessType)) throw new Error("Chat access is required.");
  const parsedConversationId = z.string().uuid().parse(conversationId);
  const parsedBody = z.string().trim().min(1).max(4000).parse(body);
  const { error } = await (await createClient()).from("chat_messages").insert({ conversation_id: parsedConversationId, sender_user_id: context.userId, sender_access: accessType, body: parsedBody });
  if (error) throw new Error(error.message);
  revalidatePath(`/${accessType}/chat`);
}

export async function markChatRead(conversationId: string, accessType: "team" | "agent" | "customer") {
  const context = await getAuthContext();
  if (!context?.memberships.some((membership) => membership.accessType === accessType)) throw new Error("Chat access is required.");
  const id = z.string().uuid().parse(conversationId);
  const { error } = await (await createClient()).from("chat_participants").update({ last_read_at: new Date().toISOString() }).eq("conversation_id", id).eq("user_id", context.userId).eq("access_type", accessType);
  if (error) throw new Error(error.message);
}
