import "server-only";

import { createClient } from "@/lib/supabase/server";

export type NotificationCategory = "meeting" | "schedule" | "announcement" | "knowledge" | "access" | "attendance" | "system";

export interface NotificationView {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreferences {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  meetingsEnabled: boolean;
  schedulesEnabled: boolean;
  announcementsEnabled: boolean;
  knowledgeEnabled: boolean;
  accessEnabled: boolean;
  attendanceEnabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
  inAppEnabled: true,
  emailEnabled: false,
  meetingsEnabled: true,
  schedulesEnabled: true,
  announcementsEnabled: true,
  knowledgeEnabled: true,
  accessEnabled: true,
  attendanceEnabled: true,
};

function mapNotification(item: { id: string; category: string; title: string; body: string; href: string | null; entity_type: string | null; entity_id: string | null; read_at: string | null; created_at: string }): NotificationView {
  return { id: item.id, category: item.category as NotificationCategory, title: item.title, body: item.body, href: item.href, entityType: item.entity_type, entityId: item.entity_id, readAt: item.read_at, createdAt: item.created_at };
}

export async function getNotificationSummary(organizationId: string) {
  const supabase = await createClient();
  const [unreadResult, recentResult] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).is("read_at", null),
    supabase.from("notifications").select("id,category,title,body,href,entity_type,entity_id,read_at,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(6),
  ]);
  if (unreadResult.error) throw new Error(unreadResult.error.message);
  if (recentResult.error) throw new Error(recentResult.error.message);
  return { unreadCount: unreadResult.count ?? 0, recent: (recentResult.data ?? []).map(mapNotification) };
}

export async function getNotificationCentreData(organizationId: string) {
  const supabase = await createClient();
  const [notificationsResult, preferencesResult] = await Promise.all([
    supabase.from("notifications").select("id,category,title,body,href,entity_type,entity_id,read_at,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
    supabase.from("notification_preferences").select("in_app_enabled,email_enabled,meetings_enabled,schedules_enabled,announcements_enabled,knowledge_enabled,access_enabled,attendance_enabled").eq("organization_id", organizationId).maybeSingle(),
  ]);
  if (notificationsResult.error) throw new Error(notificationsResult.error.message);
  if (preferencesResult.error) throw new Error(preferencesResult.error.message);
  const row = preferencesResult.data;
  const preferences = row ? { inAppEnabled: row.in_app_enabled, emailEnabled: row.email_enabled, meetingsEnabled: row.meetings_enabled, schedulesEnabled: row.schedules_enabled, announcementsEnabled: row.announcements_enabled, knowledgeEnabled: row.knowledge_enabled, accessEnabled: row.access_enabled, attendanceEnabled: row.attendance_enabled } : defaultPreferences;
  return { notifications: (notificationsResult.data ?? []).map(mapNotification), preferences };
}
