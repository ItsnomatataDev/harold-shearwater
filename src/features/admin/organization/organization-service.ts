import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface OrganizationStructureData {
  departments: Array<{ id: string; name: string; description: string | null; active: boolean; memberCount: number }>;
  locations: Array<{ id: string; name: string; code: string; address: string | null; timezone: string; active: boolean; memberCount: number }>;
  teams: Array<{ id: string; name: string; description: string | null; departmentId: string | null; departmentName: string; active: boolean; memberCount: number }>;
}

export async function getOrganizationStructure(organizationId: string): Promise<OrganizationStructureData> {
  const supabase = await createClient();
  const [departments, locations, teams, memberships, teamMembers] = await Promise.all([
    supabase.from("departments").select("id,name,description,active").eq("organization_id", organizationId).order("name"),
    supabase.from("locations").select("id,name,code,address,timezone,active").eq("organization_id", organizationId).order("name"),
    supabase.from("teams").select("id,name,description,department_id,active").eq("organization_id", organizationId).order("name"),
    supabase.from("access_memberships").select("id,department_id,primary_location_id").eq("organization_id", organizationId).eq("access_type", "team").eq("status", "active"),
    supabase.from("team_members").select("team_id,membership_id"),
  ]);
  for (const result of [departments, locations, teams, memberships, teamMembers]) if (result.error) throw new Error(result.error.message);
  const departmentNames = new Map((departments.data ?? []).map((item) => [item.id, item.name]));
  return {
    departments: (departments.data ?? []).map((item) => ({ ...item, memberCount: (memberships.data ?? []).filter((member) => member.department_id === item.id).length })),
    locations: (locations.data ?? []).map((item) => ({ ...item, memberCount: (memberships.data ?? []).filter((member) => member.primary_location_id === item.id).length })),
    teams: (teams.data ?? []).map((item) => ({ id: item.id, name: item.name, description: item.description, departmentId: item.department_id, departmentName: item.department_id ? departmentNames.get(item.department_id) ?? "Unassigned" : "Unassigned", active: item.active, memberCount: (teamMembers.data ?? []).filter((member) => member.team_id === item.id).length })),
  };
}
