import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface TeamMember { id: string; userId: string; email: string; firstName: string; lastName: string; fullName: string; jobTitle: string; status: "invited" | "active" | "suspended"; roles: Array<{ id: string; name: string; key: string }>; joinedAt: string | null; invitedBy: string | null }
export interface Role { id: string; name: string; key: string; description: string }

export async function getCrewData(organizationId: string) {
  const supabase = await createClient();
  const [membersResult, rolesResult] = await Promise.all([
    supabase.from("access_memberships").select("id,user_id,status,joined_at,invited_by").eq("organization_id", organizationId).eq("access_type", "team").order("created_at", { ascending: false }),
    supabase.from("roles").select("id,name,key,description").eq("organization_id", organizationId).eq("access_type", "team"),
  ]);
  if (membersResult.error) throw new Error(membersResult.error.message); if (rolesResult.error) throw new Error(rolesResult.error.message);
  const memberships = membersResult.data ?? []; const membershipIds = memberships.map((member) => member.id); const userIds = memberships.map((member) => member.user_id);
  const [profilesResult, membershipRolesResult] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id,email,first_name,last_name,job_title").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    membershipIds.length ? supabase.from("membership_roles").select("membership_id,roles(id,name,key)").in("membership_id", membershipIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw new Error(profilesResult.error.message); if (membershipRolesResult.error) throw new Error(membershipRolesResult.error.message);
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const members: TeamMember[] = memberships.map((member) => { const profile = profiles.get(member.user_id); const firstName = profile?.first_name ?? ""; const lastName = profile?.last_name ?? ""; return { id: member.id, userId: member.user_id, email: profile?.email ?? "", firstName, lastName, fullName: `${firstName} ${lastName}`.trim() || profile?.email || "Team member", jobTitle: profile?.job_title ?? "Team Member", status: member.status, roles: (membershipRolesResult.data ?? []).filter((row) => row.membership_id === member.id && row.roles).map((row) => row.roles!), joinedAt: member.joined_at, invitedBy: member.invited_by }; });
  return { members, roles: rolesResult.data ?? [] };
}
