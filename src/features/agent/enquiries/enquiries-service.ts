import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";

export type EnquiryStatus =
  | "new"
  | "qualifying"
  | "quote_requested"
  | "quoted"
  | "reservation_requested"
  | "confirmed"
  | "complete"
  | "cancelled";

export interface AgentEnquiry {
  id: string;
  reference: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  partySize: number;
  productInterest: string | null;
  requestedDate: string | null;
  notes: string | null;
  externalBookingReference: string | null;
  quoteAmount: number | null;
  quoteCurrency: string;
  lastContactAt: string | null;
  followUpAt: string | null;
  completedAt: string | null;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgentEnquiryEvent {
  id: string;
  eventType:
    | "created"
    | "note"
    | "status_changed"
    | "email"
    | "document"
    | "quote"
    | "reservation"
    | "review"
    | "upsell";
  body: string;
  createdAt: string;
}

export interface AgentEnquiryFollowup {
  id: string;
  kind: "general" | "post_sale" | "review" | "upsell";
  title: string;
  notes: string | null;
  dueAt: string | null;
  status: "open" | "completed" | "cancelled";
  completedAt: string | null;
}

const enquirySelect =
  "id,reference,contact_name,contact_email,contact_phone,party_size,product_interest,requested_date,notes,status,external_booking_reference,quote_amount,quote_currency,last_contact_at,follow_up_at,completed_at,created_at,updated_at";
const legacyEnquirySelect =
  "id,contact_name,contact_email,contact_phone,party_size,product_interest,requested_date,notes,status,created_at,updated_at";

function fallbackReference(id: string) {
  return `SW-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function mapEnquiry(row: {
  id: string;
  reference: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  party_size: number;
  product_interest: string | null;
  requested_date: string | null;
  notes: string | null;
  status: string;
  external_booking_reference: string | null;
  quote_amount: number | null;
  quote_currency: string;
  last_contact_at: string | null;
  follow_up_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}): AgentEnquiry {
  return {
    id: row.id,
    reference: row.reference,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    partySize: row.party_size,
    productInterest: row.product_interest,
    requestedDate: row.requested_date,
    notes: row.notes,
    status: row.status as EnquiryStatus,
    externalBookingReference: row.external_booking_reference,
    quoteAmount: row.quote_amount,
    quoteCurrency: row.quote_currency,
    lastContactAt: row.last_contact_at,
    followUpAt: row.follow_up_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLegacyEnquiry(row: {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  party_size: number;
  product_interest: string | null;
  requested_date: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}): AgentEnquiry {
  return {
    id: row.id,
    reference: fallbackReference(row.id),
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    partySize: row.party_size,
    productInterest: row.product_interest,
    requestedDate: row.requested_date,
    notes: row.notes,
    status: row.status as EnquiryStatus,
    externalBookingReference: null,
    quoteAmount: null,
    quoteCurrency: "USD",
    lastContactAt: null,
    followUpAt: null,
    completedAt: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAgentEnquiries(
  organizationId: string,
  membershipId: string,
): Promise<AgentEnquiry[]> {
  const supabase = await createClient();
  const modernResult = await supabase
    .from("agent_enquiries")
    .select(enquirySelect)
    .eq("organization_id", organizationId)
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: false });
  if (!modernResult.error) return (modernResult.data ?? []).map(mapEnquiry);
  if (!isMissingDatabaseObject(modernResult.error)) {
    throw new Error(modernResult.error.message);
  }

  const legacyResult = await supabase
    .from("agent_enquiries")
    .select(legacyEnquirySelect)
    .eq("organization_id", organizationId)
    .eq("membership_id", membershipId)
    .order("created_at", { ascending: false });
  if (legacyResult.error) throw new Error(legacyResult.error.message);
  return (legacyResult.data ?? []).map(mapLegacyEnquiry);
}

export async function getAgentEnquiryDetail(
  organizationId: string,
  membershipId: string,
  enquiryId: string,
): Promise<{
  enquiry: AgentEnquiry;
  events: AgentEnquiryEvent[];
  followups: AgentEnquiryFollowup[];
} | null> {
  const supabase = await createClient();
  const enquiryResult = await supabase
    .from("agent_enquiries")
    .select(enquirySelect)
    .eq("id", enquiryId)
    .eq("organization_id", organizationId)
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (enquiryResult.error) {
    if (!isMissingDatabaseObject(enquiryResult.error)) {
      throw new Error(enquiryResult.error.message);
    }
    const legacyResult = await supabase
      .from("agent_enquiries")
      .select(legacyEnquirySelect)
      .eq("id", enquiryId)
      .eq("organization_id", organizationId)
      .eq("membership_id", membershipId)
      .maybeSingle();
    if (legacyResult.error) throw new Error(legacyResult.error.message);
    if (!legacyResult.data) return null;
    return {
      enquiry: mapLegacyEnquiry(legacyResult.data),
      events: [],
      followups: [],
    };
  }
  if (!enquiryResult.data) return null;

  const [eventsResult, followupsResult] = await Promise.all([
    supabase
      .from("agent_enquiry_events")
      .select("id,event_type,body,created_at")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: false }),
    supabase
      .from("agent_enquiry_followups")
      .select("id,kind,title,notes,due_at,status,completed_at")
      .eq("enquiry_id", enquiryId)
      .order("created_at", { ascending: false }),
  ]);
  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (followupsResult.error) throw new Error(followupsResult.error.message);

  return {
    enquiry: mapEnquiry(enquiryResult.data),
    events: (eventsResult.data ?? []).map((row) => ({
      id: row.id,
      eventType: row.event_type as AgentEnquiryEvent["eventType"],
      body: row.body,
      createdAt: row.created_at,
    })),
    followups: (followupsResult.data ?? []).map((row) => ({
      id: row.id,
      kind: row.kind as AgentEnquiryFollowup["kind"],
      title: row.title,
      notes: row.notes,
      dueAt: row.due_at,
      status: row.status as AgentEnquiryFollowup["status"],
      completedAt: row.completed_at,
    })),
  };
}
