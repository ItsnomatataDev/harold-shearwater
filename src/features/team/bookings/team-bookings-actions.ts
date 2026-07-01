"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import type { EnquiryStatus } from "@/features/agent/enquiries/enquiries-service";
import type { BookingRequestStatus } from "./team-bookings-service";
import {
  computeHoldExpiresAt,
  RESERVATION_HOLD_HOURS,
} from "@/features/booking/reservation-holds";

async function requireTeamOrg(organizationId: string) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team access is required.");
  }
  return team;
}

export async function updateTeamEnquiryStatus(
  organizationId: string,
  enquiryId: string,
  status: EnquiryStatus,
) {
  const team = await requireTeamOrg(organizationId);
  const supabase = await createClient();

  const patch =
    status === "on_hold"
      ? { status, hold_expires_at: computeHoldExpiresAt() }
      : { status, hold_expires_at: null };

  const { error } = await supabase
    .from("agent_enquiries")
    .update(patch)
    .eq("id", enquiryId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const { error: eventError } = await supabase
    .from("agent_enquiry_events")
    .insert({
      organization_id: organizationId,
      enquiry_id: enquiryId,
      actor_membership_id: team.membership.id,
      event_type: "status_changed",
      body: `Team updated status to ${status.replaceAll("_", " ")}.`,
      metadata: { status },
    });
  if (eventError && !isMissingDatabaseObject(eventError)) {
    throw new Error(eventError.message);
  }

  revalidatePath("/team/bookings");
  revalidatePath(`/team/bookings/enquiries/${enquiryId}`);
  revalidatePath("/agent/enquiries");
}

export async function placeTeamEnquiryHold(
  organizationId: string,
  enquiryId: string,
) {
  const team = await requireTeamOrg(organizationId);
  const supabase = await createClient();
  const holdExpiresAt = computeHoldExpiresAt();

  const { error } = await supabase
    .from("agent_enquiries")
    .update({
      status: "on_hold",
      hold_expires_at: holdExpiresAt,
    })
    .eq("id", enquiryId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const { error: eventError } = await supabase
    .from("agent_enquiry_events")
    .insert({
      organization_id: organizationId,
      enquiry_id: enquiryId,
      actor_membership_id: team.membership.id,
      event_type: "reservation",
      body: `Team placed a ${RESERVATION_HOLD_HOURS}-hour reservation hold until ${new Date(holdExpiresAt).toLocaleString("en-GB")}.`,
      metadata: { holdExpiresAt, holdHours: RESERVATION_HOLD_HOURS },
    });
  if (eventError && !isMissingDatabaseObject(eventError)) {
    throw new Error(eventError.message);
  }

  revalidatePath("/team/bookings");
  revalidatePath(`/team/bookings/enquiries/${enquiryId}`);
  revalidatePath("/agent/enquiries");
  revalidatePath(`/agent/enquiries/${enquiryId}`);
}

const noteSchema = z.object({
  enquiryId: z.string().uuid(),
  body: z.string().trim().min(1).max(3000),
});

export async function addTeamEnquiryNote(
  organizationId: string,
  input: unknown,
) {
  const team = await requireTeamOrg(organizationId);
  const parsed = noteSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase.from("agent_enquiry_events").insert({
    organization_id: organizationId,
    enquiry_id: parsed.enquiryId,
    actor_membership_id: team.membership.id,
    event_type: "note",
    body: parsed.body,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/team/bookings/enquiries/${parsed.enquiryId}`);
}

export async function updateTeamBookingRequestStatus(
  organizationId: string,
  requestId: string,
  status: BookingRequestStatus,
) {
  await requireTeamOrg(organizationId);
  const supabase = await createClient();

  const patch =
    status === "on_hold"
      ? { status, hold_expires_at: computeHoldExpiresAt() }
      : { status, hold_expires_at: null };

  const { error } = await (supabase as any)
    .from("booking_requests")
    .update(patch)
    .eq("id", requestId)
    .eq("organization_id", organizationId);
  if (error) {
    if (isMissingDatabaseObject(error)) {
      throw new Error("Booking requests are not enabled yet.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/team/bookings");
  revalidatePath(`/team/bookings/requests/${requestId}`);
}

export async function placeTeamBookingRequestHold(
  organizationId: string,
  requestId: string,
) {
  await requireTeamOrg(organizationId);
  const supabase = await createClient();
  const holdExpiresAt = computeHoldExpiresAt();

  const { error } = await (supabase as any)
    .from("booking_requests")
    .update({
      status: "on_hold",
      hold_expires_at: holdExpiresAt,
    })
    .eq("id", requestId)
    .eq("organization_id", organizationId);
  if (error) {
    if (isMissingDatabaseObject(error)) {
      throw new Error("Booking requests are not enabled yet.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/team/bookings");
  revalidatePath(`/team/bookings/requests/${requestId}`);
}
