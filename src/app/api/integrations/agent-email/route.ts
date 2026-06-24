import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const inboundSchema = z.object({
  organizationId: z.string().uuid(),
  membershipId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  enquiryId: z.string().uuid().optional(),
  subject: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(150).optional(),
  senderEmail: z.email(),
  recipientEmail: z.email().optional(),
  body: z.string().trim().min(1).max(50_000),
  externalMessageId: z.string().trim().max(500).optional(),
});

function validSecret(request: Request) {
  const expected = process.env.AGENT_EMAIL_WEBHOOK_SECRET;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied) return false;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

export async function POST(request: Request) {
  if (!validSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = inboundSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email payload" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("access_memberships")
    .select("id,user_id")
    .eq("id", input.membershipId)
    .eq("organization_id", input.organizationId)
    .eq("access_type", "agent")
    .eq("status", "active")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json(
      { error: "Agent membership not found" },
      { status: 404 },
    );
  }

  if (input.enquiryId) {
    const { data: enquiry } = await admin
      .from("agent_enquiries")
      .select("id")
      .eq("id", input.enquiryId)
      .eq("organization_id", input.organizationId)
      .eq("membership_id", input.membershipId)
      .maybeSingle();
    if (!enquiry) {
      return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
    }
  }

  let threadId = input.threadId;
  if (threadId) {
    const { data: thread } = await admin
      .from("inbox_threads")
      .select("id")
      .eq("id", threadId)
      .eq("organization_id", input.organizationId)
      .eq("membership_id", input.membershipId)
      .maybeSingle();
    if (!thread)
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  } else {
    const { data: thread, error } = await admin
      .from("inbox_threads")
      .insert({
        organization_id: input.organizationId,
        membership_id: input.membershipId,
        context_type: input.enquiryId ? "enquiry" : "general",
        context_id: input.enquiryId ?? null,
        subject: input.subject,
        unread_count: 1,
      })
      .select("id")
      .single();
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    threadId = thread.id;
  }

  const now = new Date().toISOString();
  const { error } = await admin.from("inbox_messages").insert({
    organization_id: input.organizationId,
    thread_id: threadId,
    direction: "inbound",
    body: `From: ${input.contactName || input.senderEmail}\n\n${input.body}`,
    is_system: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await admin
    .from("inbox_threads")
    .update({ last_message_at: now })
    .eq("id", threadId);

  if (input.enquiryId) {
    await admin.from("agent_enquiry_events").insert({
      organization_id: input.organizationId,
      enquiry_id: input.enquiryId,
      actor_membership_id: input.membershipId,
      event_type: "email",
      body: `Message received from ${input.senderEmail}: ${input.subject}`,
      metadata: { threadId },
    });
  }

  return NextResponse.json({ ok: true, threadId });
}
