"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamContext } from "@/features/auth/services/auth-context";

const preferenceSchema = z.object({
  inAppEnabled: z.boolean(),
  meetingsEnabled: z.boolean(),
  schedulesEnabled: z.boolean(),
  announcementsEnabled: z.boolean(),
  knowledgeEnabled: z.boolean(),
  accessEnabled: z.boolean(),
  attendanceEnabled: z.boolean(),
});

async function guard() {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) throw new Error("Team Access is required.");
  return team;
}

function refreshNotifications() {
  revalidatePath("/team", "layout");
  revalidatePath("/team/notifications");
}

export async function setNotificationRead(notificationId: string, read: boolean) {
  const team = await guard();
  const id = z.string().uuid().parse(notificationId);
  const { error } = await (await createClient()).from("notifications").update({ read_at: read ? new Date().toISOString() : null }).eq("id", id).eq("organization_id", team.membership.organizationId!);
  if (error) throw new Error(error.message);
  refreshNotifications();
}

export async function markAllNotificationsRead() {
  const team = await guard();
  const { error } = await (await createClient()).from("notifications").update({ read_at: new Date().toISOString() }).eq("organization_id", team.membership.organizationId!).is("read_at", null);
  if (error) throw new Error(error.message);
  refreshNotifications();
}

export async function deleteNotification(notificationId: string) {
  const team = await guard();
  const id = z.string().uuid().parse(notificationId);
  const { error } = await (await createClient()).from("notifications").delete().eq("id", id).eq("organization_id", team.membership.organizationId!);
  if (error) throw new Error(error.message);
  refreshNotifications();
}

export async function updateNotificationPreferences(input: unknown) {
  const team = await guard();
  const preferences = preferenceSchema.parse(input);
  const { error } = await (await createClient()).from("notification_preferences").upsert({
    user_id: team.context.userId,
    organization_id: team.membership.organizationId!,
    in_app_enabled: preferences.inAppEnabled,
    email_enabled: false,
    meetings_enabled: preferences.meetingsEnabled,
    schedules_enabled: preferences.schedulesEnabled,
    announcements_enabled: preferences.announcementsEnabled,
    knowledge_enabled: preferences.knowledgeEnabled,
    access_enabled: preferences.accessEnabled,
    attendance_enabled: preferences.attendanceEnabled,
  }, { onConflict: "user_id,organization_id" });
  if (error) throw new Error(error.message);
  refreshNotifications();
}
