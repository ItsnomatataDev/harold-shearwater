"use server";

import { revalidatePath } from "next/cache";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  meeting_type: z.enum([
    "internal",
    "briefing",
    "debrief",
    "client",
    "agent",
    "other",
  ]),
  scheduled_at: z.string().min(1, "Scheduled time is required"),
  location_notes: z.string().optional(),
});

export type MeetingFormState = {
  error?: string;
  success?: boolean;
  meetingId?: string;
};

export async function addMeeting(
  _prev: MeetingFormState,
  formData: FormData,
): Promise<MeetingFormState> {
  const ctx = await requireTeamContext();
  if (!ctx) return { error: "Unauthorized" };

  const parsed = meetingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert({
      organization_id: ctx.membership.organizationId!,
      title: parsed.data.title,
      description: parsed.data.description || null,
      meeting_type: parsed.data.meeting_type,
      scheduled_at: parsed.data.scheduled_at,
      starts_at: parsed.data.scheduled_at,
      location_notes: parsed.data.location_notes || null,
      location: parsed.data.location_notes || null,
      status: "scheduled" as const,
      created_by: ctx.context.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/team/meetings");
  return { success: true, meetingId: data.id };
}

export async function updateMeetingStatus(
  meetingId: string,
  status: "scheduled" | "in_progress" | "completed" | "cancelled",
): Promise<{ error?: string }> {
  const ctx = await requireTeamContext();
  if (!ctx) return { error: "Unauthorized" };

  const supabase = await createClient();
  const update: {
    status: "scheduled" | "in_progress" | "completed" | "cancelled";
    ended_at?: string | null;
    ends_at?: string | null;
  } = { status };
  if (status === "completed" || status === "in_progress") {
    update.ended_at = status === "completed" ? new Date().toISOString() : null;
    update.ends_at = update.ended_at;
  }

  const { error } = await supabase
    .from("meetings")
    .update(update)
    .eq("id", meetingId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) return { error: error.message };
  revalidatePath("/team/meetings");
  return {};
}

export async function saveMeetingNotes(
  meetingId: string,
  notes: string,
): Promise<{ error?: string }> {
  const ctx = await requireTeamContext();
  if (!ctx) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("meetings")
    .update({ notes })
    .eq("id", meetingId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) return { error: error.message };
  revalidatePath(`/team/meetings`);
  return {};
}

export async function addMeetingAction(
  meetingId: string,
  title: string,
  assigneeId?: string,
  dueDate?: string,
): Promise<{ error?: string }> {
  const ctx = await requireTeamContext();
  if (!ctx) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase.from("meeting_actions").insert({
    meeting_id: meetingId,
    title,
    assignee_id: assigneeId || null,
    due_date: dueDate || null,
    status: "open" as const,
  });

  if (error) return { error: error.message };
  revalidatePath("/team/meetings");
  return {};
}

export async function completeMeetingAction(
  actionId: string,
): Promise<{ error?: string }> {
  const ctx = await requireTeamContext();
  if (!ctx) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("meeting_actions")
    .update({ status: "done" as const })
    .eq("id", actionId);

  if (error) return { error: error.message };
  revalidatePath("/team/meetings");
  return {};
}
