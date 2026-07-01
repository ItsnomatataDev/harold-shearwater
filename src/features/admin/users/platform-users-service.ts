import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformUser = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  accessType: "team" | "agent" | "customer";
  status: "invited" | "active" | "suspended";
  organization: string;
  roles: string[];
  joinedAt: string | null;
  keyAccountAssistantName: string | null;
  keyAccountTeamMembershipId: string | null;
};

export type TeamMemberOption = {
  membershipId: string;
  name: string;
  email: string;
};

export async function getPlatformUsers(): Promise<PlatformUser[]> {
  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("access_memberships")
    .select("id,user_id,access_type,status,organization_id,joined_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const userIds = Array.from(new Set((memberships ?? []).map((item) => item.user_id)));
  const organizationIds = Array.from(new Set((memberships ?? []).flatMap((item) => item.organization_id ? [item.organization_id] : [])));
  const membershipIds = (memberships ?? []).map((item) => item.id);
  const [profilesResult, organizationsResult, rolesResult, keyAccountsResult] =
    await Promise.all([
    userIds.length ? admin.from("profiles").select("id,first_name,last_name,email").in("id", userIds) : Promise.resolve({ data: [], error: null }),
    organizationIds.length ? admin.from("organizations").select("id,name").in("id", organizationIds) : Promise.resolve({ data: [], error: null }),
    membershipIds.length ? admin.from("membership_roles").select("membership_id,roles(name)").in("membership_id", membershipIds) : Promise.resolve({ data: [], error: null }),
    membershipIds.length
      ? (admin as any)
          .from("key_account_assignments")
          .select("partner_membership_id,team_membership_id")
          .in("partner_membership_id", membershipIds)
          .eq("active", true)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [profilesResult, organizationsResult, rolesResult, keyAccountsResult]) if (result.error) throw new Error(result.error.message);
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const organizations = new Map((organizationsResult.data ?? []).map((organization) => [organization.id, organization.name]));
  const keyAccountTeamIds = Array.from(
    new Set(
      ((keyAccountsResult.data ?? []) as Array<{ team_membership_id: string }>).map(
        (row) => row.team_membership_id,
      ),
    ),
  );
  const keyAccountByPartner = new Map(
    ((keyAccountsResult.data ?? []) as Array<{
      partner_membership_id: string;
      team_membership_id: string;
    }>).map((row) => [row.partner_membership_id, row.team_membership_id]),
  );
  let assistantNameByTeamMembership = new Map<string, string>();
  if (keyAccountTeamIds.length) {
    const { data: assistantMemberships } = await admin
      .from("access_memberships")
      .select("id,user_id")
      .in("id", keyAccountTeamIds);
    const assistantUserIds = (assistantMemberships ?? []).map((m) => m.user_id);
    const assistantProfiles = assistantUserIds.length
      ? await admin
          .from("profiles")
          .select("id,first_name,last_name,email")
          .in("id", assistantUserIds)
      : { data: [] };
    const assistantProfileMap = new Map(
      (assistantProfiles.data ?? []).map((p) => [p.id, p]),
    );
    assistantNameByTeamMembership = new Map(
      (assistantMemberships ?? []).map((membership) => {
        const profile = assistantProfileMap.get(membership.user_id);
        const name =
          `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
          profile?.email ||
          "Team member";
        return [membership.id, name] as const;
      }),
    );
  }
  return (memberships ?? []).map((membership) => {
    const profile = profiles.get(membership.user_id);
    const keyAccountTeamMembershipId =
      keyAccountByPartner.get(membership.id) ?? null;
    return {
      membershipId: membership.id,
      userId: membership.user_id,
      name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || profile?.email || "Unnamed user",
      email: profile?.email ?? "",
      accessType: membership.access_type,
      status: membership.status,
      organization: membership.organization_id ? organizations.get(membership.organization_id) ?? "Unknown organization" : "Customer Access",
      roles: (rolesResult.data ?? []).filter((row) => row.membership_id === membership.id && row.roles).map((row) => row.roles!.name),
      joinedAt: membership.joined_at,
      keyAccountTeamMembershipId,
      keyAccountAssistantName: keyAccountTeamMembershipId
        ? assistantNameByTeamMembership.get(keyAccountTeamMembershipId) ?? null
        : null,
    };
  });
}

export async function getTeamMemberOptions(): Promise<TeamMemberOption[]> {
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("id")
    .eq("type", "shearwater")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!org) return [];

  const { data: memberships, error } = await admin
    .from("access_memberships")
    .select("id,user_id")
    .eq("organization_id", org.id)
    .eq("access_type", "team")
    .eq("status", "active");
  if (error) throw new Error(error.message);

  const userIds = (memberships ?? []).map((m) => m.user_id);
  if (!userIds.length) return [];

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email")
    .in("id", userIds);
  if (profileError) throw new Error(profileError.message);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (memberships ?? []).map((membership) => {
    const profile = profileMap.get(membership.user_id);
    return {
      membershipId: membership.id,
      name:
        `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
        profile?.email ||
        "Team member",
      email: profile?.email ?? "",
    };
  });
}
