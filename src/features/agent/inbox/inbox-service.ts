import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";

export interface InboxMessage {
  id: string;
  senderId: string | null;
  direction: "inbound" | "outbound" | "internal";
  body: string;
  docUrl: string | null;
  docName: string | null;
  docMimeType: string | null;
  isSystem: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface InboxThread {
  id: string;
  subject: string;
  contextType: string | null;
  contextId: string | null;
  status: "open" | "archived";
  lastMessageAt: string;
  unreadCount: number;
  messages: InboxMessage[];
}

export async function getInbox(membershipId: string): Promise<InboxThread[]> {
  const supabase = await createClient();
  const { data: threads, error } = await supabase
    .from("inbox_threads")
    .select(
      "id,subject,context_type,context_id,status,last_message_at,unread_count",
    )
    .eq("membership_id", membershipId)
    .order("last_message_at", { ascending: false });

  if (error) {
    if (isMissingDatabaseObject(error)) return [];
    throw new Error(error.message);
  }

  if (!threads?.length) return [];

  const ids = threads.map((t) => t.id);
  const { data: msgs, error: mErr } = await supabase
    .from("inbox_messages")
    .select(
      "id,thread_id,sender_id,direction,body,doc_url,doc_name,doc_mime_type,is_system,read_at,created_at",
    )
    .in("thread_id", ids)
    .order("created_at", { ascending: true });

  if (mErr) throw new Error(mErr.message);

  return threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    contextType: t.context_type,
    contextId: t.context_id,
    status: t.status as InboxThread["status"],
    lastMessageAt: t.last_message_at,
    unreadCount: t.unread_count,
    messages: (msgs ?? [])
      .filter((m) => m.thread_id === t.id)
      .map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        direction: m.direction as InboxMessage["direction"],
        body: m.body,
        docUrl: m.doc_url,
        docName: m.doc_name,
        docMimeType: m.doc_mime_type,
        isSystem: m.is_system,
        readAt: m.read_at,
        createdAt: m.created_at,
      })),
  }));
}

export async function getTeamInbox(
  organizationId: string,
): Promise<InboxThread[]> {
  const supabase = await createClient();
  const { data: threads, error } = await supabase
    .from("inbox_threads")
    .select(
      "id,subject,context_type,context_id,status,last_message_at,unread_count,membership_id",
    )
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false });

  if (error) {
    if (isMissingDatabaseObject(error)) return [];
    throw new Error(error.message);
  }

  if (!threads?.length) return [];

  const ids = threads.map((t) => t.id);
  const { data: msgs, error: mErr } = await supabase
    .from("inbox_messages")
    .select(
      "id,thread_id,sender_id,direction,body,doc_url,doc_name,doc_mime_type,is_system,read_at,created_at",
    )
    .in("thread_id", ids)
    .order("created_at", { ascending: true });

  if (mErr) throw new Error(mErr.message);

  return threads.map((t) => ({
    id: t.id,
    subject: t.subject,
    contextType: t.context_type,
    contextId: t.context_id,
    status: t.status as InboxThread["status"],
    lastMessageAt: t.last_message_at,
    unreadCount: t.unread_count,
    messages: (msgs ?? [])
      .filter((m) => m.thread_id === t.id)
      .map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        direction: m.direction as InboxMessage["direction"],
        body: m.body,
        docUrl: m.doc_url,
        docName: m.doc_name,
        docMimeType: m.doc_mime_type,
        isSystem: m.is_system,
        readAt: m.read_at,
        createdAt: m.created_at,
      })),
  }));
}

