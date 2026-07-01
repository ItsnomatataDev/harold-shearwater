import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type AccessType = Database["public"]["Enums"]["access_type"];

export interface ActiveMembership {
  id: string;
  accessType: AccessType;
  organizationId: string | null;
  organizationName: string | null;
  organizationSlug: string | null;
  primaryLocationId: string | null;
  primaryLocationName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  employeeNumber: string | null;
}

export interface AuthContext {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  jobTitle: string;
  phone: string;
  avatarUrl: string | null;
  timezone: string;
  memberships: ActiveMembership[];
  /** The portal chosen at sign-up (from auth metadata), if any. */
  intendedPortal: AccessType | null;
  /** Agent-specific: name of the agency from profile onboarding. */
  agencyName: string | null;
  /** Agent-specific: agency website from profile onboarding. */
  website: string | null;
}

export function getAccessHomePath(accessType: AccessType) {
  if (accessType === "team") return "/team/dashboard";
  if (accessType === "agent") return "/agent";
  return "/customer";
}

const ADMIN_PORTAL_PERMISSIONS = [
  "members.manage",
  "roles.manage",
  "audit.view",
  "attendance.manage",
  "organization.manage",
] as const;

const getAuthContextCached = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  let userId = claims?.sub as string | undefined;
  let userMetadata =
    (claims?.user_metadata as Record<string, unknown> | undefined) ?? {};
  let claimEmail = typeof claims?.email === "string" ? claims.email : "";

  if (claimsError || !userId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return null;
    userId = user.id;
    userMetadata = user.user_metadata ?? {};
    claimEmail = user.email ?? "";
  }

  const [{ data: profile }, { data: memberships, error: membershipError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "first_name,last_name,email,job_title,phone,avatar_url,timezone,agency_name,website",
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("access_memberships")
        .select(
          "id,access_type,organization_id,primary_location_id,department_id,employee_number,organizations(name,slug),locations!primary_location_id(name),departments(name)",
        )
        .eq("user_id", userId)
        .eq("status", "active"),
    ]);

  if (membershipError)
    throw new Error(
      `Unable to load access memberships: ${membershipError.message}`,
    );

  const firstName =
    profile?.first_name?.trim() ||
    (typeof userMetadata.first_name === "string"
      ? userMetadata.first_name
      : undefined) ||
    "Shearwater";
  const lastName =
    profile?.last_name?.trim() ||
    (typeof userMetadata.last_name === "string"
      ? userMetadata.last_name
      : undefined) ||
    "User";
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const rawPortal = userMetadata.portal_access as string | undefined;
  const intendedPortal: AccessType | null =
    rawPortal === "team" || rawPortal === "agent" || rawPortal === "customer"
      ? rawPortal
      : null;

  return {
    userId,
    email:
      profile?.email ||
      claimEmail ||
      "",
    firstName,
    lastName,
    fullName,
    initials,
    jobTitle: profile?.job_title || "Team Member",
    phone: profile?.phone || "",
    avatarUrl: profile?.avatar_url ?? null,
    timezone: profile?.timezone || "Africa/Harare",
    agencyName: profile?.agency_name ?? null,
    website: profile?.website ?? null,
    intendedPortal,
    memberships: (memberships ?? []).map((membership) => ({
      id: membership.id,
      accessType: membership.access_type,
      organizationId: membership.organization_id,
      organizationName: membership.organizations?.name ?? null,
      organizationSlug: membership.organizations?.slug ?? null,
      primaryLocationId: membership.primary_location_id,
      primaryLocationName: membership.locations?.name ?? null,
      departmentId: membership.department_id,
      departmentName: membership.departments?.name ?? null,
      employeeNumber: membership.employee_number,
    })),
  };
});

export async function getAuthContext(): Promise<AuthContext | null> {
  return getAuthContextCached();
}

export async function requireTeamContext() {
  const context = await getAuthContext();
  if (!context) return null;
  const membership = context.memberships.find(
    (item) => item.accessType === "team",
  );
  return membership ? { context, membership } : null;
}

export async function requireAgentContext() {
  const context = await getAuthContext();
  if (!context) return null;
  const membership = context.memberships.find(
    (item) => item.accessType === "agent",
  );
  return membership ? { context, membership } : null;
}

export async function requireAccessContext(accessType: AccessType) {
  const context = await getAuthContext();
  if (!context) return null;
  const membership = context.memberships.find(
    (item) => item.accessType === accessType,
  );
  return membership ? { context, membership } : null;
}

type MembershipRoleRow = {
  roles: {
    key: string;
    role_permissions: Array<{ permissions: { key: string } | null }> | null;
  } | null;
};

async function getMembershipRoleRows(membershipId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_roles")
    .select("roles!inner(key, role_permissions(permissions!inner(key)))")
    .eq("membership_id", membershipId);

  if (error) {
    throw new Error(`Unable to verify admin access: ${error.message}`);
  }

  return (data ?? []) as MembershipRoleRow[];
}

function membershipHasAdminPortalAccess(rows: MembershipRoleRow[]) {
  const adminPermissions = new Set<string>(ADMIN_PORTAL_PERMISSIONS);

  return rows.some((row) => {
    const role = row.roles;
    if (!role) return false;
    if (role.key === "team_admin") return true;

    return (role.role_permissions ?? []).some(
      (entry) =>
        entry.permissions?.key != null &&
        adminPermissions.has(entry.permissions.key),
    );
  });
}

export async function hasTeamAdminAccess(membershipId: string) {
  const rows = await getMembershipRoleRows(membershipId);
  return rows.some((row) => row.roles?.key === "team_admin");
}

export async function hasOrganizationPermission(
  organizationId: string,
  permission: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  // Generated Supabase types may not include RPC signatures in early migrations.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("has_permission", {
    target_organization_id: organizationId,
    required_permission: permission,
  });

  if (!error) {
    return Boolean(data);
  }

  const missingPublicRpc = error.message.includes(
    "Could not find the function public.has_permission",
  );

  if (!missingPublicRpc) {
    throw new Error(
      `Unable to verify permission ${permission}: ${error.message}`,
    );
  }

  // Fallback for environments where only private.has_permission exists.
  const { data: permissionRow, error: permissionError } = await supabase
    .from("permissions")
    .select("id")
    .eq("key", permission)
    .maybeSingle();

  if (permissionError) {
    throw new Error(
      `Unable to verify permission ${permission}: ${permissionError.message}`,
    );
  }

  if (!permissionRow) return false;

  const { data: memberships, error: membershipsError } = await supabase
    .from("access_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .eq("access_type", "team")
    .eq("status", "active");

  if (membershipsError) {
    throw new Error(
      `Unable to verify permission ${permission}: ${membershipsError.message}`,
    );
  }

  const membershipIds = (memberships ?? []).map((membership) => membership.id);
  if (!membershipIds.length) return false;

  const { data: membershipRoles, error: membershipRolesError } = await supabase
    .from("membership_roles")
    .select("role_id")
    .in("membership_id", membershipIds);

  if (membershipRolesError) {
    throw new Error(
      `Unable to verify permission ${permission}: ${membershipRolesError.message}`,
    );
  }

  const roleIds = Array.from(
    new Set((membershipRoles ?? []).map((item) => item.role_id)),
  );
  if (!roleIds.length) return false;

  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .from("role_permissions")
    .select("role_id")
    .eq("permission_id", permissionRow.id)
    .in("role_id", roleIds)
    .limit(1);

  if (rolePermissionsError) {
    throw new Error(
      `Unable to verify permission ${permission}: ${rolePermissionsError.message}`,
    );
  }

  return (rolePermissions ?? []).length > 0;
}

export async function hasAdminPortalAccess() {
  const team = await requireTeamContext();
  if (!team || !team.membership.organizationId) return false;

  const rows = await getMembershipRoleRows(team.membership.id);
  return membershipHasAdminPortalAccess(rows);
}

export interface AdminLayoutContext {
  context: AuthContext;
  membership: ActiveMembership;
  isPlatformAdmin: boolean;
}

export async function requireAdminLayoutContext(): Promise<AdminLayoutContext | null> {
  const team = await requireTeamContext();
  if (!team || !team.membership.organizationId) return null;

  const [roleRows, platformAdminResult] = await Promise.all([
    getMembershipRoleRows(team.membership.id),
    (await createClient()).rpc("is_platform_admin"),
  ]);

  if (platformAdminResult.error) {
    throw new Error(
      `Unable to verify platform admin access: ${platformAdminResult.error.message}`,
    );
  }

  const canAccess = membershipHasAdminPortalAccess(roleRows);
  if (!canAccess) return null;

  return {
    ...team,
    isPlatformAdmin: Boolean(platformAdminResult.data),
  };
}

export async function hasPlatformAdminAccess() {
  const context = await getAuthContext();
  if (!context) return false;
  const { data, error } = await (await createClient()).rpc("is_platform_admin");
  if (error) throw new Error(`Unable to verify platform admin access: ${error.message}`);
  return Boolean(data);
}

export async function requirePlatformAdminContext() {
  const team = await requireTeamContext();
  if (!team || !(await hasPlatformAdminAccess())) return null;
  return team;
}

export async function requireAdminPortalContext() {
  const team = await requireTeamContext();
  if (!team || !team.membership.organizationId) return null;

  const canAccess = await hasAdminPortalAccess();
  if (!canAccess) return null;

  return team;
}

export async function requireTeamAdminContext() {
  const team = await requireTeamContext();
  if (!team) return null;

  const canAccess = await hasTeamAdminAccess(team.membership.id);
  if (!canAccess) return null;

  return team;
}
