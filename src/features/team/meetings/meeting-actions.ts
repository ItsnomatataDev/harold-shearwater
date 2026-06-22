"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";

const meetingSchema = z.object({ title: z.string().trim().min(2).max(160), description: z.string().trim().max(3000).optional(), startsAt: z.string().datetime(), endsAt: z.string().datetime().optional(), location: z.string().trim().max(200).optional(), attendeeIds: z.array(z.string().uuid()).min(1) });

export async function createMeeting(organizationId: string, input: unknown) {
  const parsed = meetingSchema.parse(input);
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) throw new Error("Team Access is required.");
  if (!(await hasOrganizationPermission(organizationId, "meetings.manage"))) throw new Error("You do not have permission to create meetings.");
  if (parsed.endsAt && new Date(parsed.endsAt) <= new Date(parsed.startsAt)) throw new Error("Meeting end time must be after its start time.");
  const supabase = await createClient();
  const attendeeIds = Array.from(new Set([...parsed.attendeeIds, team.context.userId]));
  const memberships = await supabase.from("access_memberships").select("user_id").eq("organization_id", organizationId).eq("access_type", "team").eq("status", "active").in("user_id", attendeeIds);
  if (memberships.error) throw new Error(memberships.error.message);
  if ((memberships.data ?? []).length !== attendeeIds.length) throw new Error("One or more attendees are not active staff members.");
  const { data: meeting, error } = await supabase.from("meetings").insert({ organization_id: organizationId, title: parsed.title, description: parsed.description || null, starts_at: parsed.startsAt, ends_at: parsed.endsAt || null, location: parsed.location || null, created_by: team.context.userId }).select("id").single();
  if (error) throw new Error(error.message);
  const attendeeResult = await supabase.from("meeting_attendees").insert(attendeeIds.map((userId) => ({ meeting_id: meeting.id, user_id: userId, response: userId === team.context.userId ? "accepted" as const : "needs_action" as const })));
  if (attendeeResult.error) throw new Error(attendeeResult.error.message);
  revalidatePath("/team/meetings");
  revalidatePath("/team/dashboard");
}

export async function respondToMeeting(meetingId: string, response: "accepted" | "declined" | "tentative") {
  const team = await requireTeamContext();
  if (!team) throw new Error("Team Access is required.");
  const { error } = await (await createClient()).from("meeting_attendees").update({ response }).eq("meeting_id", meetingId).eq("user_id", team.context.userId);
  if (error) throw new Error(error.message);
  revalidatePath("/team/meetings");
  revalidatePath("/team/dashboard");
}
