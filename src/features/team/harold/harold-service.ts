import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export async function getHaroldConversations(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // @ts-expect-error - harold_conversations table not in Supabase types yet
  const { data, error } = await (supabase.from("harold_conversations") as any)
    .select(
      `
      id,
      organization_id,
      user_id,
      title,
      created_at,
      updated_at
    `,
    )
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data as any[]) ?? [];
}

export async function getConversationMessages(conversationId: string) {
  const supabase = await createClient();

  // @ts-expect-error - harold_messages table not in Supabase types yet
  const { data, error } = await (supabase.from("harold_messages") as any)
    .select("id,conversation_id,role,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data as any[]) ?? [];
}
