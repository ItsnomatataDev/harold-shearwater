import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  jobTitle: string;
  status: "invited" | "active" | "suspended";
  roles: Array<{ id: string; name: string; key: string }>;
  joinedAt: string | null;
  invitedBy: string | null;
}

export interface Role {
  id: string;
  name: string;
  key: string;
  description: string;
}

export async function getCrewData(organizationId: string) {
  const supabase = await createClient();

  const [membersResult, rolesResult] = await Promise.all([
    supabase
      .from("access_memberships")
      .select(
        `
        id,
        user_id,
        status,
        joined_at,
        invited_by,
        profiles!user_id(id, email, first_name, last_name, job_title),
        membership_roles(roles(id, name, key, description))
      `,
      )
      .eq("organization_id", organizationId)
      .eq("access_type", "team")
      .order("created_at", { ascending: false }),
    supabase
      .from("roles")
      .select("id,name,key,description")
      .eq("organization_id", organizationId)
      .eq("access_type", "team"),
  ]);

  if (membersResult.error) throw new Error(membersResult.error.message);
  if (rolesResult.error) throw new Error(rolesResult.error.message);

  const members: TeamMember[] = (membersResult.data ?? []).map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    email: m.profiles.email,
    firstName: m.profiles.first_name || "",
    lastName: m.profiles.last_name || "",
    fullName:
      `${m.profiles.first_name || ""} ${m.profiles.last_name || ""}`.trim(),
    jobTitle: m.profiles.job_title || "Team Member",
    status: m.status,
    roles: (m.membership_roles ?? []).map((mr: any) => mr.roles),
    joinedAt: m.joined_at,
    invitedBy: m.invited_by,
  }));

  const roles: Role[] = rolesResult.data ?? [];

  return { members, roles };
}
