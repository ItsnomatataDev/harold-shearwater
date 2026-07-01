import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import { expireReservationHolds } from "@/features/booking/reservation-hold-service";
import type {
  AgentEnquiry,
  AgentEnquiryEvent,
  EnquiryStatus,
} from "@/features/agent/enquiries/enquiries-service";

export type BookingRequestStatus =
  | "new"
  | "reviewing"
  | "on_hold"
  | "confirmed"
  | "cancelled";

export type TeamInboxEnquiry = AgentEnquiry & {
  membershipId: string;
  agentName: string;
  agentAgency: string | null;
  agentEmail: string | null;
};

export type TeamBookingRequest = {
  id: string;
  reference: string;
  accessType: "customer" | "agent" | "team";
  productId: string | null;
  productName: string;
  preferredDate: string | null;
  endDate: string | null;
  partySize: number;
  optionLabel: string | null;
  notes: string | null;
  status: BookingRequestStatus;
  holdExpiresAt: string | null;
  createdAt: string;
  requesterName: string | null;
  requesterEmail: string | null;
};

const enquirySelect =
  "id,reference,membership_id,contact_name,contact_email,contact_phone,party_size,product_interest,requested_date,notes,status,external_booking_reference,golden_dusk_booking_id,golden_dusk_reservation_status,golden_dusk_payment_status,golden_dusk_synced_at,quote_amount,quote_currency,last_contact_at,follow_up_at,completed_at,hold_expires_at,created_at,updated_at";

function mapEnquiryRow(row: {
  id: string;
  reference: string;
  membership_id: string | null;
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
  membership?: {
    profiles?: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      agency_name: string | null;
    } | null;
  } | null;
}): TeamInboxEnquiry {
  const profile = row.membership?.profiles;
  const agentName =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    profile?.email ||
    "Agent";

  return {
    id: row.id,
    reference: row.reference,
    membershipId: row.membership_id ?? "",
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
    agentName,
    agentAgency: profile?.agency_name ?? null,
    agentEmail: profile?.email ?? null,
  };
}

export async function getTeamBookingInbox(organizationId: string) {
  await expireReservationHolds(organizationId).catch(() => {
    // Holds can still be expired via the integration endpoint if columns are missing.
  });

  const supabase = await createClient();

  const enquiriesResult = await supabase
    .from("agent_enquiries")
    .select(enquirySelect)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (enquiriesResult.error) {
    if (!isMissingDatabaseObject(enquiriesResult.error)) {
      throw new Error(enquiriesResult.error.message);
    }
  }

  const enquiryRows = enquiriesResult.data ?? [];
  const membershipIds = Array.from(
    new Set(
      enquiryRows
        .map((row) => row.membership_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const profilesByMembership = new Map<
    string,
    {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      agency_name: string | null;
    }
  >();

  if (membershipIds.length) {
    const { data: members, error } = await supabase
      .from("access_memberships")
      .select(
        "id,profiles!fk_access_memberships_user_profiles(first_name,last_name,email,agency_name)",
      )
      .in("id", membershipIds);
    if (error) throw new Error(error.message);
    for (const member of members ?? []) {
      profilesByMembership.set(
        member.id,
        (member.profiles as {
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          agency_name: string | null;
        } | null) ?? {
          first_name: null,
          last_name: null,
          email: null,
          agency_name: null,
        },
      );
    }
  }

  const enquiries = enquiryRows.map((row) =>
    mapEnquiryRow({
      ...row,
      membership: row.membership_id
        ? { profiles: profilesByMembership.get(row.membership_id) }
        : undefined,
    }),
  );

  let requests: TeamBookingRequest[] = [];
  const requestsResult = await (supabase as any)
    .from("booking_requests")
    .select(
      "id,reference,access_type,product_id,product_name,preferred_date,end_date,party_size,option_label,notes,status,hold_expires_at,created_at,membership_id",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (!requestsResult.error) {
    const requestRows = (requestsResult.data ?? []) as Array<{
      id: string;
      reference: string;
      access_type: string;
      product_id: string | null;
      product_name: string;
      preferred_date: string | null;
      end_date: string | null;
      party_size: number;
      option_label: string | null;
      notes: string | null;
      status: string;
      hold_expires_at: string | null;
      created_at: string;
      membership_id: string;
    }>;

    const requestMembershipIds = Array.from(
      new Set(requestRows.map((row) => row.membership_id)),
    );
    const profilesByMembership = new Map<
      string,
      { name: string | null; email: string | null }
    >();

    if (requestMembershipIds.length) {
      const { data: members } = await supabase
        .from("access_memberships")
        .select(
          "id,profiles!fk_access_memberships_user_profiles(first_name,last_name,email)",
        )
        .in("id", requestMembershipIds);
      for (const member of members ?? []) {
        const profile = member.profiles as {
          first_name: string | null;
          last_name: string | null;
          email: string | null;
        } | null;
        profilesByMembership.set(member.id, {
          name:
            `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
            null,
          email: profile?.email ?? null,
        });
      }
    }

    requests = requestRows.map((row) => {
      const requester = profilesByMembership.get(row.membership_id);
      return {
        id: row.id,
        reference: row.reference,
        accessType: row.access_type as TeamBookingRequest["accessType"],
        productId: row.product_id,
        productName: row.product_name,
        preferredDate: row.preferred_date,
        endDate: row.end_date,
        partySize: row.party_size,
        optionLabel: row.option_label,
        notes: row.notes,
        status: row.status as BookingRequestStatus,
        holdExpiresAt: row.hold_expires_at ?? null,
        createdAt: row.created_at,
        requesterName: requester?.name ?? null,
        requesterEmail: requester?.email ?? null,
      };
    });
  }

  return {
    enquiries,
    requests,
    summary: {
      openEnquiries: enquiries.filter(
        (item) => !["complete", "cancelled"].includes(item.status),
      ).length,
      openRequests: requests.filter(
        (item) => !["confirmed", "cancelled"].includes(item.status),
      ).length,
    },
  };
}

export async function getTeamEnquiryDetail(
  organizationId: string,
  enquiryId: string,
) {
  await expireReservationHolds(organizationId).catch(() => {});

  const supabase = await createClient();
  const enquiryResult = await supabase
    .from("agent_enquiries")
    .select(enquirySelect)
    .eq("organization_id", organizationId)
    .eq("id", enquiryId)
    .maybeSingle();

  if (enquiryResult.error) throw new Error(enquiryResult.error.message);
  if (!enquiryResult.data) return null;

  const { data: member } = enquiryResult.data.membership_id
    ? await supabase
        .from("access_memberships")
        .select(
          "profiles!fk_access_memberships_user_profiles(first_name,last_name,email,agency_name)",
        )
        .eq("id", enquiryResult.data.membership_id)
        .maybeSingle()
    : { data: null };

  const eventsResult = await supabase
    .from("agent_enquiry_events")
    .select("id,event_type,body,created_at")
    .eq("enquiry_id", enquiryId)
    .order("created_at", { ascending: false });

  if (eventsResult.error) throw new Error(eventsResult.error.message);

  return {
    enquiry: mapEnquiryRow({
      ...enquiryResult.data,
      membership: {
        profiles: (member?.profiles as {
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          agency_name: string | null;
        } | null) ?? null,
      },
    }),
    events: (eventsResult.data ?? []).map((row) => ({
      id: row.id,
      eventType: row.event_type as AgentEnquiryEvent["eventType"],
      body: row.body,
      createdAt: row.created_at,
    })),
  };
}

export async function getTeamBookingRequestDetail(
  organizationId: string,
  requestId: string,
) {
  await expireReservationHolds(organizationId).catch(() => {});

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("booking_requests")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    if (isMissingDatabaseObject(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  return {
    id: data.id,
    reference: data.reference,
    accessType: data.access_type as TeamBookingRequest["accessType"],
    productId: data.product_id,
    productName: data.product_name,
    preferredDate: data.preferred_date,
    endDate: data.end_date,
    partySize: data.party_size,
    optionLabel: data.option_label,
    notes: data.notes,
    status: data.status as BookingRequestStatus,
    holdExpiresAt: data.hold_expires_at ?? null,
    createdAt: data.created_at,
    availabilitySnapshot: data.availability_snapshot as Record<string, unknown>,
  };
}
