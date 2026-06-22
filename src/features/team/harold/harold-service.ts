import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface HaroldMessage { id: string; conversationId: string; role: "user" | "assistant"; content: string; createdAt: string }
export interface HaroldConversation { id: string; title: string; createdAt: string; updatedAt: string; messages: HaroldMessage[] }

export async function getHaroldConversations(organizationId: string): Promise<HaroldConversation[]> {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("User not authenticated");
  const { data: conversations, error } = await supabase.from("harold_conversations").select("id,title,created_at,updated_at").eq("organization_id", organizationId).eq("user_id", user.id).order("updated_at", { ascending: false }); if (error) throw new Error(error.message);
  const ids = (conversations ?? []).map((item) => item.id);
  const messages = ids.length ? await supabase.from("harold_messages").select("id,conversation_id,role,content,created_at").in("conversation_id", ids).order("created_at") : { data: [], error: null }; if (messages.error) throw new Error(messages.error.message);
  return (conversations ?? []).map((conversation) => ({ id: conversation.id, title: conversation.title, createdAt: conversation.created_at, updatedAt: conversation.updated_at, messages: (messages.data ?? []).filter((message) => message.conversation_id === conversation.id).map((message) => ({ id: message.id, conversationId: message.conversation_id, role: message.role as HaroldMessage["role"], content: message.content, createdAt: message.created_at })) }));
}
