"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamContext } from "@/features/auth/services/auth-context";

const schema = z.object({ conversationId: z.string().uuid().optional(), message: z.string().trim().min(1).max(10_000) });

export async function sendHaroldMessage(organizationId: string, input: unknown) {
  const parsed = schema.parse(input);
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) throw new Error("Team Access is required.");
  const supabase = await createClient();
  let conversationId = parsed.conversationId;
  if (conversationId) {
    const { data, error } = await supabase.from("harold_conversations").select("id").eq("id", conversationId).eq("organization_id", organizationId).eq("user_id", team.context.userId).maybeSingle();
    if (error) throw new Error(error.message); if (!data) throw new Error("Conversation not found.");
  } else {
    const { data, error } = await supabase.from("harold_conversations").insert({ organization_id: organizationId, user_id: team.context.userId, title: parsed.message.slice(0, 60) }).select("id").single();
    if (error) throw new Error(error.message); conversationId = data.id;
  }
  const { data: message, error } = await supabase.from("harold_messages").insert({ conversation_id: conversationId, role: "user", content: parsed.message }).select("id,created_at").single();
  if (error) throw new Error(error.message);
  await supabase.from("harold_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
  revalidatePath("/team/harold");
  return { conversationId, message: { id: message.id, conversationId, role: "user" as const, content: parsed.message, createdAt: message.created_at } };
}
