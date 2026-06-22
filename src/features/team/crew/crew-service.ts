import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface TeamMember { id: string; userId: string; email: string; firstName: string; lastName: string; fullName: string; jobTitle: string; status: "invited" | "active" | "suspended"; roles: Array<{ id: string; name: string; key: string }>; joinedAt: string | null; departmentId: string | null; departmentName: string; locationId: string | null; locationName: string; managerMembershipId: string | null; managerName: string; employeeNumber: string | null; teamIds: string[] }
export interface Role { id: string; name: string; key: string; description: string }
export interface PendingInvitation { id: string; email: string; roleName: string; createdAt: string; expiresAt: string }
export interface CrewOptions { departments: Array<{ id: string; name: string }>; locations: Array<{ id: string; name: string }>; teams: Array<{ id: string; name: string }> }

export async function getCrewData(organizationId: string) {
  const supabase = await createClient();
  const [membersResult, rolesResult, departmentsResult, locationsResult, teamsResult, invitationsResult] = await Promise.all([
    supabase.from("access_memberships").select("id,user_id,status,joined_at,department_id,primary_location_id,manager_membership_id,employee_number").eq("organization_id", organizationId).eq("access_type", "team").order("created_at", { ascending: false }),
    supabase.from("roles").select("id,name,key,description").eq("organization_id", organizationId).eq("access_type", "team").order("name"),
    supabase.from("departments").select("id,name").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabase.from("locations").select("id,name").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabase.from("teams").select("id,name").eq("organization_id", organizationId).eq("active", true).order("name"),
    supabase.from("invitations").select("id,email,role_id,created_at,expires_at").eq("organization_id", organizationId).eq("access_type", "team").is("accepted_at", null).order("created_at", { ascending: false }),
  ]);
  for (const result of [membersResult, rolesResult, departmentsResult, locationsResult, teamsResult, invitationsResult]) if (result.error) throw new Error(result.error.message);
  const memberships = membersResult.data ?? []; const membershipIds = memberships.map((member) => member.id); const userIds = memberships.map((member) => member.user_id);
  const [profilesResult, membershipRolesResult, teamMembersResult] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id,email,first_name,last_name,job_title").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    membershipIds.length ? supabase.from("membership_roles").select("membership_id,roles(id,name,key)").in("membership_id", membershipIds) : Promise.resolve({ data: [], error: null }),
    membershipIds.length ? supabase.from("team_members").select("team_id,membership_id").in("membership_id", membershipIds) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [profilesResult, membershipRolesResult, teamMembersResult]) if (result.error) throw new Error(result.error.message);
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile])); const departments = new Map((departmentsResult.data ?? []).map((item) => [item.id, item.name])); const locations = new Map((locationsResult.data ?? []).map((item) => [item.id, item.name]));
  const namesByMembership = new Map(memberships.map((member) => { const profile = profiles.get(member.user_id); return [member.id, `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || profile?.email || "Team member"]; }));
  const members: TeamMember[] = memberships.map((member) => { const profile = profiles.get(member.user_id); const firstName = profile?.first_name ?? ""; const lastName = profile?.last_name ?? ""; return { id: member.id, userId: member.user_id, email: profile?.email ?? "", firstName, lastName, fullName: namesByMembership.get(member.id) ?? "Team member", jobTitle: profile?.job_title ?? "Team Member", status: member.status, roles: (membershipRolesResult.data ?? []).filter((row) => row.membership_id === member.id && row.roles).map((row) => row.roles!), joinedAt: member.joined_at, departmentId: member.department_id, departmentName: member.department_id ? departments.get(member.department_id) ?? "Unassigned" : "Unassigned", locationId: member.primary_location_id, locationName: member.primary_location_id ? locations.get(member.primary_location_id) ?? "Unassigned" : "Unassigned", managerMembershipId: member.manager_membership_id, managerName: member.manager_membership_id ? namesByMembership.get(member.manager_membership_id) ?? "Unassigned" : "Unassigned", employeeNumber: member.employee_number, teamIds: (teamMembersResult.data ?? []).filter((row) => row.membership_id === member.id).map((row) => row.team_id) }; });
  const rolesById = new Map((rolesResult.data ?? []).map((role) => [role.id, role.name]));
  const pendingInvitations: PendingInvitation[] = (invitationsResult.data ?? []).map((invitation) => ({ id: invitation.id, email: invitation.email, roleName: invitation.role_id ? rolesById.get(invitation.role_id) ?? "Team Member" : "Team Member", createdAt: invitation.created_at, expiresAt: invitation.expires_at }));
  return { members, roles: rolesResult.data ?? [], pendingInvitations, options: { departments: departmentsResult.data ?? [], locations: locationsResult.data ?? [], teams: teamsResult.data ?? [] } satisfies CrewOptions };
}
