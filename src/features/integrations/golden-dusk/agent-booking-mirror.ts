import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import type { GoldenDuskReservation } from "./agent-booking-types";

export async function mirrorGoldenDuskBookingToEnquiry(input: {
  organizationId: string;
  membershipId: string;
  enquiryId?: string;
  reference?: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  partySize: number;
  productInterest: string;
  requestedDate?: string | null;
  notes?: string | null;
  reservation: GoldenDuskReservation;
}) {
  const supabase = await createClient();
  const bookingId = input.reservation.id;
  const externalRef = String(bookingId);
  const snapshot = input.reservation as unknown as Record<string, unknown>;
  const patch = {
    status: input.reservation.reservationStatus === "Cancelled" ? "cancelled" : "confirmed",
    external_booking_reference: externalRef,
    golden_dusk_booking_id: bookingId,
    golden_dusk_reservation_status: input.reservation.reservationStatus ?? null,
    golden_dusk_payment_status: input.reservation.paymentStatus ?? null,
    golden_dusk_snapshot: snapshot,
    golden_dusk_synced_at: new Date().toISOString(),
    quote_amount: input.reservation.totalAmount ?? null,
    quote_currency: input.reservation.currency?.code ?? "USD",
  };

  if (input.enquiryId) {
    const { error } = await (supabase as any)
      .from("agent_enquiries")
      .update(patch)
      .eq("id", input.enquiryId)
      .eq("organization_id", input.organizationId)
      .eq("membership_id", input.membershipId);
    if (error && !isMissingDatabaseObject(error)) {
      throw new Error(error.message);
    }

    await recordGoldenDuskEnquiryEvent({
      organizationId: input.organizationId,
      enquiryId: input.enquiryId,
      membershipId: input.membershipId,
      body: `GoldenDusk booking #${bookingId} confirmed in SWAIBMS.`,
      metadata: { goldenDuskBookingId: bookingId },
    });

    return { enquiryId: input.enquiryId, reference: input.reference ?? null };
  }

  const reference =
    input.reference ??
    `SW-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;

  const { data, error } = await (supabase as any)
    .from("agent_enquiries")
    .insert({
      organization_id: input.organizationId,
      membership_id: input.membershipId,
      reference,
      contact_name: input.contactName,
      contact_email: input.contactEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      party_size: input.partySize,
      product_interest: input.productInterest,
      requested_date: input.requestedDate ?? null,
      notes: input.notes ?? null,
      ...patch,
    })
    .select("id,reference")
    .single();

  if (error) {
    if (isMissingDatabaseObject(error)) {
      throw new Error(
        "GoldenDusk booking mirror is not enabled yet. Apply the latest database migration.",
      );
    }
    throw new Error(error.message);
  }

  await recordGoldenDuskEnquiryEvent({
    organizationId: input.organizationId,
    enquiryId: data.id,
    membershipId: input.membershipId,
    body: `GoldenDusk booking #${bookingId} confirmed in SWAIBMS.`,
    metadata: { goldenDuskBookingId: bookingId },
  });

  return { enquiryId: data.id as string, reference: data.reference as string };
}

export async function syncGoldenDuskBookingMirror(input: {
  organizationId: string;
  enquiryId: string;
  reservation: GoldenDuskReservation;
}) {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    external_booking_reference: String(input.reservation.id),
    golden_dusk_booking_id: input.reservation.id,
    golden_dusk_reservation_status: input.reservation.reservationStatus ?? null,
    golden_dusk_payment_status: input.reservation.paymentStatus ?? null,
    golden_dusk_snapshot: input.reservation,
    golden_dusk_synced_at: new Date().toISOString(),
    quote_amount: input.reservation.totalAmount ?? null,
    quote_currency: input.reservation.currency?.code ?? "USD",
  };
  if (input.reservation.reservationStatus === "Cancelled") {
    patch.status = "cancelled";
  } else if (input.reservation.reservationStatus === "Confirmed") {
    patch.status = "confirmed";
  }

  const { error } = await (supabase as any)
    .from("agent_enquiries")
    .update(patch)
    .eq("id", input.enquiryId)
    .eq("organization_id", input.organizationId);

  if (error && !isMissingDatabaseObject(error)) {
    throw new Error(error.message);
  }
}

async function recordGoldenDuskEnquiryEvent(input: {
  organizationId: string;
  enquiryId: string;
  membershipId: string;
  body: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("agent_enquiry_events").insert({
    organization_id: input.organizationId,
    enquiry_id: input.enquiryId,
    actor_membership_id: input.membershipId,
    event_type: "reservation",
    body: input.body,
    metadata: (input.metadata ?? {}) as import("@/types/database").Json,
  });
  if (error && !isMissingDatabaseObject(error)) {
    throw new Error(error.message);
  }
}

export async function markEnquiryCancelledFromGoldenDusk(input: {
  organizationId: string;
  membershipId: string;
  enquiryId: string;
  bookingId: number;
  reservation?: GoldenDuskReservation | null;
}) {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("agent_enquiries")
    .update({
      status: "cancelled",
      golden_dusk_reservation_status: "Cancelled",
      golden_dusk_snapshot: input.reservation ?? {},
      golden_dusk_synced_at: new Date().toISOString(),
    })
    .eq("id", input.enquiryId)
    .eq("organization_id", input.organizationId)
    .eq("membership_id", input.membershipId);

  if (error && !isMissingDatabaseObject(error)) {
    throw new Error(error.message);
  }

  await recordGoldenDuskEnquiryEvent({
    organizationId: input.organizationId,
    enquiryId: input.enquiryId,
    membershipId: input.membershipId,
    body: `GoldenDusk booking #${input.bookingId} cancelled in SWAIBMS.`,
    metadata: { goldenDuskBookingId: input.bookingId },
  });
}
