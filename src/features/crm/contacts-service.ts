import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ContactStatus =
  | "lead"
  | "prospect"
  | "active"
  | "past_guest"
  | "vip"
  | "lost";
export type ContactSource =
  | "direct"
  | "agent"
  | "harold_chat"
  | "referral"
  | "walk_in"
  | "website"
  | "other";

export interface CrmContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  source: ContactSource | null;
  sourceDetail: string | null;
  status: ContactStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "task"
  | "harold_chat";

export interface CrmActivity {
  id: string;
  contactId: string;
  membershipId: string | null;
  memberName: string | null;
  type: ActivityType;
  body: string;
  occurredAt: string;
  createdAt: string;
}

const CONTACT_COLS =
  "id,first_name,last_name,email,phone,nationality,source,source_detail,status,notes,created_at,updated_at";

function mapContact(row: Record<string, unknown>): CrmContact {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string | null,
    phone: row.phone as string | null,
    nationality: row.nationality as string | null,
    source: row.source as ContactSource | null,
    sourceDetail: row.source_detail as string | null,
    status: row.status as ContactStatus,
    notes: row.notes as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getCrmContacts(
  organizationId: string,
): Promise<CrmContact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .select(CONTACT_COLS)
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContact);
}

export async function getCrmContact(
  organizationId: string,
  contactId: string,
): Promise<CrmContact | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .select(CONTACT_COLS)
    .eq("organization_id", organizationId)
    .eq("id", contactId)
    .single();
  if (error) return null;
  return mapContact(data);
}

export async function getCrmActivities(
  organizationId: string,
  contactId: string,
): Promise<CrmActivity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_activities")
    .select(
      "id,contact_id,membership_id,type,body,occurred_at,created_at,access_memberships(profiles(first_name,last_name))",
    )
    .eq("organization_id", organizationId)
    .eq("contact_id", contactId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const profile = (
      row as unknown as {
        access_memberships?: {
          profiles?: { first_name?: string | null; last_name?: string | null };
        };
      }
    ).access_memberships?.profiles;
    const memberName = profile
      ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        null
      : null;
    return {
      id: row.id as string,
      contactId: row.contact_id as string,
      membershipId: row.membership_id as string | null,
      memberName,
      type: row.type as ActivityType,
      body: row.body as string,
      occurredAt: row.occurred_at as string,
      createdAt: row.created_at as string,
    };
  });
}
