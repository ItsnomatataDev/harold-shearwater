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

  let rawMembers: any[] = (membersResult.data as any[]) ?? [];

  if (membersResult.error) {
    const missingRelationship = membersResult.error.message.includes(
      "Could not find a relationship",
    );

    if (!missingRelationship) {
      throw new Error(membersResult.error.message);
    }

    const fallbackMembersResult = await supabase
      .from("access_memberships")
      .select(
        `
        id,
        user_id,
        status,
        joined_at,
        invited_by,
        membership_roles(roles(id, name, key, description))
      `,
      )
      .eq("organization_id", organizationId)
      .eq("access_type", "team")
      .order("created_at", { ascending: false });

    if (fallbackMembersResult.error) {
      throw new Error(fallbackMembersResult.error.message);
    }

    rawMembers = (fallbackMembersResult.data as any[]) ?? [];
  }

  if (rolesResult.error) throw new Error(rolesResult.error.message);

  const userIds = Array.from(
    new Set(rawMembers.map((m: any) => m.user_id).filter(Boolean)),
  );

  const { data: profilesData, error: profilesError } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id,email,first_name,last_name,job_title")
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) throw new Error(profilesError.message);

  const profilesById = new Map(
    (profilesData ?? []).map((profile: any) => [profile.id, profile]),
  );

  const members: TeamMember[] = rawMembers.map((m: any) => {
    const joinedProfile =
      m.profiles && !Array.isArray(m.profiles)
        ? m.profiles
        : profilesById.get(m.user_id) || null;

    const firstName = joinedProfile?.first_name || "";
    const lastName = joinedProfile?.last_name || "";

    return {
      id: m.id,
      userId: m.user_id,
      email: joinedProfile?.email || "",
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      jobTitle: joinedProfile?.job_title || "Team Member",
      status: m.status,
      roles: (m.membership_roles ?? []).map((mr: any) => mr.roles),
      joinedAt: m.joined_at,
      invitedBy: m.invited_by,
    };
  });

  const roles: Role[] = rolesResult.data ?? [];

  return { members, roles };
}
