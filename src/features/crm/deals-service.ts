import "server-only";

import { createClient } from "@/lib/supabase/server";

export type DealStage =
  | "enquiry"
  | "quoted"
  | "confirmed"
  | "complete"
  | "lost";

export interface CrmDeal {
  id: string;
  contactId: string;
  contactName: string;
  ownerMembershipId: string | null;
  ownerName: string | null;
  title: string;
  value: number | null;
  currency: string;
  stage: DealStage;
  closeDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEAL_COLS =
  "id,contact_id,owner_membership_id,title,value,currency,stage,close_date,notes,created_at,updated_at," +
  "crm_contacts(first_name,last_name)," +
  "access_memberships(profiles(first_name,last_name))";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDeal(row: any): CrmDeal {
  const contact = row.crm_contacts;
  const owner = row.access_memberships?.profiles;
  return {
    id: row.id,
    contactId: row.contact_id,
    contactName: contact
      ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
      : "Unknown",
    ownerMembershipId: row.owner_membership_id,
    ownerName: owner
      ? [owner.first_name, owner.last_name].filter(Boolean).join(" ") || null
      : null,
    title: row.title,
    value: row.value,
    currency: row.currency ?? "USD",
    stage: row.stage as DealStage,
    closeDate: row.close_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCrmDeals(organizationId: string): Promise<CrmDeal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_deals")
    .select(DEAL_COLS)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDeal);
}

export async function getCrmDealsByContact(
  organizationId: string,
  contactId: string,
): Promise<CrmDeal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_deals")
    .select(DEAL_COLS)
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDeal);
}
