import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import { expireReservationHolds } from "@/features/booking/reservation-hold-service";

export type EnquiryStatus =
  | "new"
  | "qualifying"
  | "quote_requested"
  | "quoted"
  | "reservation_requested"
  | "on_hold"
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
  goldenDuskBookingId: number | null;
  goldenDuskReservationStatus: string | null;
  goldenDuskPaymentStatus: string | null;
  goldenDuskSyncedAt: string | null;
  quoteAmount: number | null;
  quoteCurrency: string;
  lastContactAt: string | null;
  followUpAt: string | null;
  completedAt: string | null;
  holdExpiresAt: string | null;
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
  "id,reference,contact_name,contact_email,contact_phone,party_size,product_interest,requested_date,notes,status,external_booking_reference,golden_dusk_booking_id,golden_dusk_reservation_status,golden_dusk_payment_status,golden_dusk_synced_at,quote_amount,quote_currency,last_contact_at,follow_up_at,completed_at,hold_expires_at,created_at,updated_at";
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
  golden_dusk_booking_id: number | null;
  golden_dusk_reservation_status: string | null;
  golden_dusk_payment_status: string | null;
  golden_dusk_synced_at: string | null;
  quote_amount: number | null;
  quote_currency: string;
  last_contact_at: string | null;
  follow_up_at: string | null;
  completed_at: string | null;
  hold_expires_at: string | null;
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
    goldenDuskBookingId: row.golden_dusk_booking_id ?? null,
    goldenDuskReservationStatus: row.golden_dusk_reservation_status ?? null,
    goldenDuskPaymentStatus: row.golden_dusk_payment_status ?? null,
    goldenDuskSyncedAt: row.golden_dusk_synced_at ?? null,
    quoteAmount: row.quote_amount,
    quoteCurrency: row.quote_currency,
    lastContactAt: row.last_contact_at,
    followUpAt: row.follow_up_at,
    completedAt: row.completed_at,
    holdExpiresAt: row.hold_expires_at ?? null,
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
    goldenDuskBookingId: null,
    goldenDuskReservationStatus: null,
    goldenDuskPaymentStatus: null,
    goldenDuskSyncedAt: null,
    quoteAmount: null,
    quoteCurrency: "USD",
    lastContactAt: null,
    followUpAt: null,
    completedAt: null,
    holdExpiresAt: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAgentEnquiries(
  organizationId: string,
  membershipId: string,
): Promise<AgentEnquiry[]> {
  await expireReservationHolds(organizationId).catch(() => {});

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
  await expireReservationHolds(organizationId).catch(() => {});

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
