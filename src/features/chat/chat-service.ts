import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ChatMessage = { id: string; conversationId: string; senderUserId: string; senderAccess: "team" | "agent" | "customer"; senderName: string; body: string; createdAt: string };
export type ChatConversation = { id: string; title: string; category: "team" | "agent" | "customer"; unreadCount: number; updatedAt: string; participants: Array<{ userId: string; accessType: "team" | "agent" | "customer"; name: string }>; messages: ChatMessage[] };

export async function getChatConversations(userId: string): Promise<ChatConversation[]> {
  const supabase = await createClient();
  const { data: ownParticipants, error } = await supabase.from("chat_participants").select("conversation_id,last_read_at").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const ids = (ownParticipants ?? []).map((item) => item.conversation_id);
  if (!ids.length) return [];
  const [conversationResult, participantResult, messageResult] = await Promise.all([
    supabase.from("chat_conversations").select("id,title,updated_at").in("id", ids).order("updated_at", { ascending: false }),
    supabase.from("chat_participants").select("conversation_id,user_id,access_type").in("conversation_id", ids),
    supabase.from("chat_messages").select("id,conversation_id,sender_user_id,sender_access,body,created_at").in("conversation_id", ids).order("created_at", { ascending: true }).limit(1000),
  ]);
  if (conversationResult.error) throw new Error(conversationResult.error.message);
  if (participantResult.error) throw new Error(participantResult.error.message);
  if (messageResult.error) throw new Error(messageResult.error.message);
  const userIds = Array.from(new Set((participantResult.data ?? []).map((item) => item.user_id)));
  const { data: profiles } = userIds.length ? await createAdminClient().from("profiles").select("id,first_name,last_name,email").in("id", userIds) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email]));
  return (conversationResult.data ?? []).map((conversation) => {
    const participants = (participantResult.data ?? []).filter((item) => item.conversation_id === conversation.id).map((item) => ({ userId: item.user_id, accessType: item.access_type, name: names.get(item.user_id) ?? "User" }));
    const others = participants.filter((participant) => participant.userId !== userId);
    const messages = (messageResult.data ?? []).filter((item) => item.conversation_id === conversation.id).map((item) => ({ id: item.id, conversationId: item.conversation_id, senderUserId: item.sender_user_id, senderAccess: item.sender_access, senderName: names.get(item.sender_user_id) ?? "User", body: item.body, createdAt: item.created_at }));
    const lastReadAt = ownParticipants?.find((item) => item.conversation_id === conversation.id)?.last_read_at;
    return {
      id: conversation.id,
      title: others.map((participant) => participant.name).join(", ") || conversation.title,
      category: others[0]?.accessType ?? "team",
      unreadCount: messages.filter((message) => message.senderUserId !== userId && (!lastReadAt || new Date(message.createdAt) > new Date(lastReadAt))).length,
      updatedAt: conversation.updated_at,
      participants,
      messages,
    };
  });
}
