import "server-only";

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
}

export interface AuthContext {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  initials: string;
  jobTitle: string;
  memberships: ActiveMembership[];
}

export function getAccessHomePath(accessType: AccessType) {
  if (accessType === "team") return "/team/basecamp";
  if (accessType === "agent") return "/agent";
  return "/customer";
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const [{ data: profile }, { data: memberships, error: membershipError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("first_name,last_name,email,job_title")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("access_memberships")
        .select(
          "id,access_type,organization_id,primary_location_id,organizations(name,slug)",
        )
        .eq("user_id", user.id)
        .eq("status", "active"),
    ]);

  if (membershipError)
    throw new Error(
      `Unable to load access memberships: ${membershipError.message}`,
    );

  const firstName =
    profile?.first_name?.trim() ||
    user.user_metadata.first_name ||
    "Shearwater";
  const lastName =
    profile?.last_name?.trim() || user.user_metadata.last_name || "User";
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return {
    userId: user.id,
    email: profile?.email || user.email || "",
    firstName,
    lastName,
    fullName,
    initials,
    jobTitle: profile?.job_title || "Team Member",
    memberships: (memberships ?? []).map((membership) => ({
      id: membership.id,
      accessType: membership.access_type,
      organizationId: membership.organization_id,
      organizationName: membership.organizations?.name ?? null,
      organizationSlug: membership.organizations?.slug ?? null,
      primaryLocationId: membership.primary_location_id,
    })),
  };
}

export async function requireTeamContext() {
  const context = await getAuthContext();
  if (!context) return null;
  const membership = context.memberships.find(
    (item) => item.accessType === "team",
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
