import "server-only";

import {
  hasOrganizationPermission,
  requireTeamContext,
} from "@/features/auth/services/auth-context";

export async function requireTeamOrganization() {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) return null;
  return team;
}

export async function canViewProducts(organizationId: string) {
  return (
    (await hasOrganizationPermission(organizationId, "products.view")) ||
    (await hasOrganizationPermission(organizationId, "products.manage"))
  );
}

/** Catalog is API-managed; portal users never edit products directly. */
export async function canManageProducts(_organizationId: string) {
  return false;
}

export async function canViewRates(organizationId: string) {
  return (
    (await hasOrganizationPermission(organizationId, "rates.view")) ||
    (await hasOrganizationPermission(organizationId, "rates.manage"))
  );
}

/** Catalog is API-managed; portal users never edit rates directly. */
export async function canManageRates(_organizationId: string) {
  return false;
}

export async function requireProductsView() {
  const team = await requireTeamOrganization();
  if (!team) return null;
  if (!(await canViewProducts(team.membership.organizationId!))) return null;
  return team;
}

export async function requireRatesView() {
  const team = await requireTeamOrganization();
  if (!team) return null;
  if (!(await canViewRates(team.membership.organizationId!))) return null;
  return team;
}

export function revalidateCatalogPaths() {
  return [
    "/team/products",
    "/team/products/rates",
    "/admin/products",
    "/admin/products/rates",
  ] as const;
}
