import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isHaroldWebhookConfigured } from "./harold-webhook";

export type HaroldConversationStatus =
  | "ai_active"
  | "handover_requested"
  | "human_active"
  | "resolved";

export type HaroldMessageRole = "user" | "assistant" | "human" | "system";

export interface HaroldMessage {
  id: string;
  conversationId: string;
  role: HaroldMessageRole;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface HaroldConversation {
  id: string;
  title: string;
  status: HaroldConversationStatus;
  handoverReason: string | null;
  assignedToMembershipId: string | null;
  createdAt: string;
  updatedAt: string;
  messages: HaroldMessage[];
}

export async function getHaroldConversations(organizationId: string): Promise<{
  conversations: HaroldConversation[];
  webhookConfigured: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: conversations, error } = await supabase
    .from("harold_conversations")
    .select(
      "id,title,status,handover_reason,assigned_to_membership_id,created_at,updated_at",
    )
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const ids = (conversations ?? []).map((item) => item.id);
  const messages = ids.length
    ? await supabase
        .from("harold_messages")
        .select("id,conversation_id,role,content,author_user_id,created_at")
        .in("conversation_id", ids)
        .order("created_at")
    : { data: [], error: null };
  if (messages.error) throw new Error(messages.error.message);

  const humanAuthorIds = Array.from(
    new Set(
      (messages.data ?? [])
        .filter((message) => message.role === "human" && message.author_user_id)
        .map((message) => message.author_user_id as string),
    ),
  );
  const profiles = humanAuthorIds.length
    ? await supabase
        .from("profiles")
        .select("id,first_name,last_name,email")
        .in("id", humanAuthorIds)
    : { data: [], error: null };
  if (profiles.error) throw new Error(profiles.error.message);
  const authorNames = new Map(
    (profiles.data ?? []).map((profile) => [
      profile.id,
      `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
        profile.email,
    ]),
  );

  return {
    webhookConfigured: isHaroldWebhookConfigured(),
    conversations: (conversations ?? []).map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      status: conversation.status as HaroldConversationStatus,
      handoverReason: conversation.handover_reason,
      assignedToMembershipId: conversation.assigned_to_membership_id,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      messages: (messages.data ?? [])
        .filter((message) => message.conversation_id === conversation.id)
        .map((message) => ({
          id: message.id,
          conversationId: message.conversation_id,
          role: message.role as HaroldMessageRole,
          content: message.content,
          authorName:
            message.role === "assistant"
              ? "Harold"
              : message.role === "human"
                ? authorNames.get(message.author_user_id ?? "") ?? "Shearwater Team"
                : message.role === "system"
                  ? "System"
                  : "You",
          createdAt: message.created_at,
        })),
    })),
  };
}
