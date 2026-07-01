import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database";
import {
  getAuthContext,
  hasAdminPortalAccess,
  type AuthContext,
} from "./auth-context";
import { getPendingInvitationForCurrentUser } from "./invitation-service";

async function hasPendingTeamInvitation(): Promise<boolean> {
  return (await getPendingInvitationForCurrentUser()) !== null;
}

type AccessType = Database["public"]["Enums"]["access_type"];

export type PortalKey = AccessType | "admin";

export interface PortalChoice {
  key: PortalKey;
  label: string;
  description: string;
  href: string;
  /** Tailwind accent class for the card stripe */
  accentClass: string;
}

const PORTAL_META: Record<
  PortalKey,
  Omit<PortalChoice, "key" | "href"> & { defaultHref: string }
> = {
  team: {
    label: "Team Access",
    description:
      "Internal workspace for Shearwater staff — invited by an administrator only.",
    defaultHref: "/team/dashboard",
    accentClass: "bg-sunset",
  },
  agent: {
    label: "Agent Access",
    description:
      "Travel partner workspace — sign up on the login page, then get approved by Shearwater.",
    defaultHref: "/agent/dashboard",
    accentClass: "bg-gold",
  },
  customer: {
    label: "Customer Access",
    description:
      "Guest portal — sign up on the login page, then activate your account.",
    defaultHref: "/customer",
    accentClass: "bg-savannah",
  },
  admin: {
    label: "Admin Portal",
    description:
      "Governance and control — users, organization, attendance and platform settings.",
    defaultHref: "/admin/dashboard",
    accentClass: "bg-victoria",
  },
};

export const PREFERRED_PORTAL_COOKIE = "sw_preferred_portal";

function portalFromPath(path: string): PortalKey | null {
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/team")) return "team";
  if (path.startsWith("/agent")) return "agent";
  if (path.startsWith("/customer")) return "customer";
  return null;
}

export async function getAvailablePortals(
  context?: AuthContext | null,
): Promise<PortalChoice[]> {
  const auth = context ?? (await getAuthContext());
  if (!auth) return [];

  const portals: PortalChoice[] = [];

  if (auth.memberships.some((m) => m.accessType === "team" && m.organizationId)) {
    const meta = PORTAL_META.team;
    portals.push({
      key: "team",
      href: meta.defaultHref,
      label: meta.label,
      description: meta.description,
      accentClass: meta.accentClass,
    });
  }

  if (auth.memberships.some((m) => m.accessType === "agent" && m.organizationId)) {
    const meta = PORTAL_META.agent;
    portals.push({
      key: "agent",
      href: meta.defaultHref,
      label: meta.label,
      description: meta.description,
      accentClass: meta.accentClass,
    });
  }

  if (auth.memberships.some((m) => m.accessType === "customer")) {
    const meta = PORTAL_META.customer;
    portals.push({
      key: "customer",
      href: meta.defaultHref,
      label: meta.label,
      description: meta.description,
      accentClass: meta.accentClass,
    });
  }

  if (await hasAdminPortalAccess()) {
    const meta = PORTAL_META.admin;
    portals.push({
      key: "admin",
      href: meta.defaultHref,
      label: meta.label,
      description: meta.description,
      accentClass: meta.accentClass,
    });
  }

  return portals;
}

export async function resolvePostAuthDestination(
  requestedPath?: string | null,
): Promise<string> {
  const context = await getAuthContext();
  if (!context) return "/auth";

  // A user who arrived via a Team Access invite (email or link) must finish the
  // invitation flow — set a password and accept — before entering any portal.
  if (await hasPendingTeamInvitation()) {
    return "/auth/accept-invitation";
  }

  const portals = await getAvailablePortals(context);
  if (portals.length === 0) return "/access-pending";

  if (requestedPath?.startsWith("/")) {
    const needed = portalFromPath(requestedPath);
    if (needed && portals.some((portal) => portal.key === needed)) {
      return requestedPath;
    }
  }

  if (portals.length === 1) return portals[0].href;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(PREFERRED_PORTAL_COOKIE)?.value as
    | PortalKey
    | undefined;
  if (preferred && portals.some((portal) => portal.key === preferred)) {
    return portals.find((portal) => portal.key === preferred)!.href;
  }

  return "/select-access";
}

export async function redirectIfUnauthenticated() {
  const context = await getAuthContext();
  if (!context) redirect("/auth");
  return context;
}

/**
 * If the signed-in user has a pending Team Access invitation, force them into
 * the accept flow (set password + accept) before any portal can load. This
 * catches Supabase invite emails that establish a session on an arbitrary page.
 */
export async function redirectIfPendingInvitation() {
  if (await hasPendingTeamInvitation()) {
    redirect("/auth/accept-invitation");
  }
}

/** Use in portal layouts when the user is signed in but lacks this access type. */
export async function redirectIfMissingPortal(accessType: AccessType) {
  const context = await redirectIfUnauthenticated();
  await redirectIfPendingInvitation();
  const membership = context.memberships.find(
    (item) => item.accessType === accessType,
  );

  if (!membership) {
    const portals = await getAvailablePortals(context);
    redirect(portals.length ? "/select-access" : "/access-pending");
  }

  if (
    (accessType === "team" || accessType === "agent") &&
    !membership.organizationId
  ) {
    redirect("/access-pending");
  }

  return { context, membership };
}

export async function redirectIfMissingAdmin() {
  const context = await redirectIfUnauthenticated();
  await redirectIfPendingInvitation();
  const canAccess = await hasAdminPortalAccess();
  if (!canAccess) {
    const portals = await getAvailablePortals(context);
    redirect(portals.length ? "/select-access" : "/access-pending");
  }
  return context;
}

export function getPortalMeta(key: PortalKey) {
  return PORTAL_META[key];
}
