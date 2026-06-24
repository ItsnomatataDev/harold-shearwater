import { createClient } from "@/lib/supabase/server";

export type Announcement = {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  audience: "everyone" | "team" | "agents" | "managers";
  pinned: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
};

async function addAuthors(
  announcements: Omit<Announcement, "author_name">[],
): Promise<Announcement[]> {
  const authorIds = Array.from(
    new Set(
      announcements
        .map((announcement) => announcement.created_by)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (!authorIds.length) {
    return announcements.map((announcement) => ({
      ...announcement,
      author_name: "Shearwater Team",
    }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,email")
    .in("id", authorIds);
  if (error) throw error;

  const authorNames = new Map(
    (data ?? []).map((profile) => [
      profile.id,
      `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
        profile.email ||
        "Shearwater Team",
    ]),
  );

  return announcements.map((announcement) => ({
    ...announcement,
    author_name:
      (announcement.created_by && authorNames.get(announcement.created_by)) ||
      "Shearwater Team",
  }));
}

export async function getAnnouncements(
  organizationId: string,
  includeUnpublished = false,
): Promise<Announcement[]> {
  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select("*")
    .eq("organization_id", organizationId)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false });

  if (!includeUnpublished) {
    query = query.not("published_at", "is", null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return addAuthors(
    (data ?? []) as Omit<Announcement, "author_name">[],
  );
}

export async function getPinnedAnnouncements(
  organizationId: string,
): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("pinned", true)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return addAuthors(
    (data ?? []) as Omit<Announcement, "author_name">[],
  );
}
