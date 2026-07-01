export type HandoverDomain =
  | "commercial"
  | "reservations"
  | "guest_relations"
  | "operations"
  | "general";

export const HANDOVER_DOMAIN_LABELS: Record<HandoverDomain, string> = {
  commercial: "Commercial / Products & Rates",
  reservations: "Reservations",
  guest_relations: "Guest Relations",
  operations: "Operations",
  general: "General Support",
};

export const HANDOVER_DOMAIN_PERMISSIONS: Record<HandoverDomain, string[]> = {
  commercial: ["products.view", "rates.view"],
  reservations: ["schedules.manage", "tasks.manage"],
  guest_relations: ["harold.handovers.manage"],
  operations: ["tasks.manage", "schedules.manage"],
  general: ["harold.handovers.manage"],
};

export function inferHandoverDomain(input: {
  sourceAccess: "team" | "agent" | "customer";
  reason?: string | null;
  message?: string | null;
}): HandoverDomain {
  const text = `${input.reason ?? ""} ${input.message ?? ""}`.toLowerCase();

  // Guest and agent portals: any active team member may claim the handover.
  if (input.sourceAccess === "customer" || input.sourceAccess === "agent") {
    return "guest_relations";
  }

  if (/(booking|reservation|confirm|cancel|voucher|itinerary)/.test(text)) {
    return "reservations";
  }

  if (/(schedule|duty|roster|operation|incident|dispatch)/.test(text)) {
    return "operations";
  }

  if (/(product|rate|price|catalog|package)/.test(text)) {
    return "commercial";
  }

  return "general";
}

export async function memberCanHandleHandoverDomain(
  hasPermission: (permission: string) => Promise<boolean>,
  domain: HandoverDomain,
) {
  const required = HANDOVER_DOMAIN_PERMISSIONS[domain];
  for (const permission of required) {
    if (await hasPermission(permission)) return true;
  }
  return false;
}

export async function canAccessHandoverInbox(
  organizationId: string,
  hasPermission: (permission: string) => Promise<boolean>,
) {
  const domains = Object.keys(HANDOVER_DOMAIN_PERMISSIONS) as HandoverDomain[];
  for (const domain of domains) {
    if (await memberCanHandleHandoverDomain(hasPermission, domain)) {
      return true;
    }
  }
  return false;
}
