"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  requireAgentContext,
  requireTeamContext,
} from "@/features/auth/services/auth-context";

// ─── Team: open a thread and deliver a message to any membership ──────────────

export async function deliverInboxMessage(
  membershipId: string,
  subject: string,
  body: string,
  opts?: {
    contextType?: "enquiry" | "booking" | "document" | "general";
    contextId?: string;
    docUrl?: string;
    docName?: string;
    docMimeType?: string;
  },
): Promise<{ threadId: string; error?: string }> {
  const ctx = await requireTeamContext();
  if (!ctx) return { threadId: "", error: "Unauthorized" };
  const orgId = ctx.membership.organizationId;
  if (!orgId) return { threadId: "", error: "No organization" };

  const supabase = await createClient();

  // Re-use an existing open thread for the same context if one exists
  let threadId: string | null = null;
  if (opts?.contextType && opts?.contextId) {
    const { data: existing } = await supabase
      .from("inbox_threads")
      .select("id")
      .eq("membership_id", membershipId)
      .eq("context_type", opts.contextType)
      .eq("context_id", opts.contextId)
      .eq("status", "open")
      .maybeSingle();
    threadId = existing?.id ?? null;
  }

  if (!threadId) {
    const { data: thread, error: tErr } = await supabase
      .from("inbox_threads")
      .insert({
        organization_id: orgId,
        membership_id: membershipId,
        subject,
        context_type: opts?.contextType ?? "general",
        context_id: opts?.contextId ?? null,
        status: "open",
        unread_count: 1,
      })
      .select("id")
      .single();
    if (tErr) return { threadId: "", error: tErr.message };
    threadId = thread.id;
  }

  const { error: mErr } = await supabase.from("inbox_messages").insert({
    organization_id: orgId,
    thread_id: threadId,
    sender_id: ctx.membership.id,
    direction: "inbound",
    body,
    doc_url: opts?.docUrl ?? null,
    doc_name: opts?.docName ?? null,
    doc_mime_type: opts?.docMimeType ?? null,
    is_system: false,
  });
  if (mErr) return { threadId, error: mErr.message };

  // Bump last_message_at
  await supabase
    .from("inbox_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);

  revalidatePath("/agent/inbox");
  revalidatePath("/team/inbox");
  return { threadId };
}

// ─── Recipient: reply to a thread they own ───────────────────────────────────

export async function replyToThread(
  threadId: string,
  body: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Determine caller — could be agent or team member
  const agentCtx = await requireAgentContext();
  const teamCtx = agentCtx ? null : await requireTeamContext();
  const membership = agentCtx?.membership ?? teamCtx?.membership;
  if (!membership) return { error: "Unauthorized" };

  const orgId = membership.organizationId ?? "";

  const { error } = await supabase.from("inbox_messages").insert({
    organization_id: orgId,
    thread_id: threadId,
    sender_id: membership.id,
    direction: "outbound",
    body,
    is_system: false,
  });
  if (error) return { error: error.message };

  await supabase
    .from("inbox_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId);

  revalidatePath("/agent/inbox");
  revalidatePath("/team/inbox");
  return {};
}

// ─── Mark thread as read / archived ─────────────────────────────────────────

export async function markThreadRead(threadId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("inbox_threads")
    .update({ unread_count: 0 })
    .eq("id", threadId);
  await supabase
    .from("inbox_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .is("read_at", null);
  revalidatePath("/agent/inbox");
  revalidatePath("/team/inbox");
}

export async function archiveThread(threadId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("inbox_threads")
    .update({ status: "archived" })
    .eq("id", threadId);
  revalidatePath("/agent/inbox");
  revalidatePath("/team/inbox");
}
