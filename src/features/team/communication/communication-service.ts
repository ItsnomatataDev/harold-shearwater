import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AnnouncementView {
  id: string;
  title: string;
  body: string;
  category: string;
  authorName: string;
  publishedAt: string;
  expiresAt: string | null;
  status: "active" | "expired";
}

export async function getAnnouncements(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").select("id,title,body,category,created_by,published_at,expires_at").eq("organization_id", organizationId).not("published_at", "is", null).order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  const userIds = Array.from(new Set((data ?? []).map((item) => item.created_by)));
  const profiles = userIds.length ? await supabase.from("profiles").select("id,first_name,last_name,email").in("id", userIds) : { data: [], error: null };
  if (profiles.error) throw new Error(profiles.error.message);
  const people = new Map((profiles.data ?? []).map((profile) => [profile.id, `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email]));
  const now = Date.now();
  return (data ?? []).map((item) => ({ id: item.id, title: item.title, body: item.body, category: item.category, authorName: people.get(item.created_by) ?? "Shearwater Team", publishedAt: item.published_at!, expiresAt: item.expires_at, status: item.expires_at && new Date(item.expires_at).getTime() <= now ? "expired" as const : "active" as const }));
}
