"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/features/auth/services/auth-context";
import { getNotificationSummary } from "./notification-service";

export async function loadNotificationSummary(organizationId: string) {
  const parsedOrganizationId = z.string().uuid().parse(organizationId);
  const context = await getAuthContext();
  const membership = context?.memberships.find(
    (item) =>
      item.organizationId === parsedOrganizationId &&
      (item.accessType === "team" || item.accessType === "agent"),
  );
  if (!context || !membership) {
    throw new Error("Notification access is required.");
  }

  return getNotificationSummary(parsedOrganizationId, context.userId);
}

const preferenceSchema = z.object({
  inAppEnabled: z.boolean(),
  meetingsEnabled: z.boolean(),
  schedulesEnabled: z.boolean(),
  announcementsEnabled: z.boolean(),
  knowledgeEnabled: z.boolean(),
  accessEnabled: z.boolean(),
  attendanceEnabled: z.boolean(),
});

async function guard(organizationId: string) {
  const parsedOrganizationId = z.string().uuid().parse(organizationId);
  const context = await getAuthContext();
  const membership = context?.memberships.find(
    (item) =>
      item.organizationId === parsedOrganizationId &&
      (item.accessType === "team" || item.accessType === "agent"),
  );
  if (!context || !membership) throw new Error("Notification access is required.");
  return { context, membership, organizationId: parsedOrganizationId };
}

function refreshNotifications() {
  revalidatePath("/team", "layout");
  revalidatePath("/team/notifications");
  revalidatePath("/agent", "layout");
  revalidatePath("/agent/notifications");
}

export async function setNotificationRead(organizationId: string, notificationId: string, read: boolean) {
  const access = await guard(organizationId);
  const id = z.string().uuid().parse(notificationId);
  const { error } = await (await createClient()).from("notifications").update({ read_at: read ? new Date().toISOString() : null }).eq("id", id).eq("organization_id", access.organizationId).eq("recipient_user_id", access.context.userId);
  if (error) throw new Error(error.message);
  refreshNotifications();
}

export async function markAllNotificationsRead(organizationId: string) {
  const access = await guard(organizationId);
  const { error } = await (await createClient()).from("notifications").update({ read_at: new Date().toISOString() }).eq("organization_id", access.organizationId).eq("recipient_user_id", access.context.userId).is("read_at", null);
  if (error) throw new Error(error.message);
  refreshNotifications();
}

export async function deleteNotification(organizationId: string, notificationId: string) {
  const access = await guard(organizationId);
  const id = z.string().uuid().parse(notificationId);
  const { error } = await (await createClient()).from("notifications").delete().eq("id", id).eq("organization_id", access.organizationId).eq("recipient_user_id", access.context.userId);
  if (error) throw new Error(error.message);
  refreshNotifications();
}

export async function updateNotificationPreferences(organizationId: string, input: unknown) {
  const access = await guard(organizationId);
  const preferences = preferenceSchema.parse(input);
  const { error } = await (await createClient()).from("notification_preferences").upsert({
    user_id: access.context.userId,
    organization_id: access.organizationId,
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
