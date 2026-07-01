import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import {
  RESERVATION_HOLD_HOURS,
  computeHoldExpiresAt,
} from "./reservation-holds";

export type ExpireHoldsResult = {
  expiredEnquiries: number;
  expiredRequests: number;
};

export async function expireReservationHolds(
  organizationId?: string,
): Promise<ExpireHoldsResult> {
  const admin = createAdminClient() as any;
  const now = new Date().toISOString();

  let enquiryQuery = admin
    .from("agent_enquiries")
    .select("id, organization_id, reference")
    .eq("status", "on_hold")
    .not("hold_expires_at", "is", null)
    .lte("hold_expires_at", now);

  if (organizationId) {
    enquiryQuery = enquiryQuery.eq("organization_id", organizationId);
  }

  const { data: expiredEnquiries, error: enquiryReadError } = await enquiryQuery;
  if (enquiryReadError && !isMissingDatabaseObject(enquiryReadError)) {
    throw new Error(enquiryReadError.message);
  }

  let expiredEnquiryCount = 0;
  for (const row of expiredEnquiries ?? []) {
    const { error: updateError } = await admin
      .from("agent_enquiries")
      .update({ status: "cancelled", hold_expires_at: null })
      .eq("id", row.id)
      .eq("status", "on_hold");
    if (updateError) continue;

    expiredEnquiryCount += 1;
    await admin.from("agent_enquiry_events").insert({
      organization_id: row.organization_id,
      enquiry_id: row.id,
      event_type: "reservation",
      body: `${RESERVATION_HOLD_HOURS}-hour reservation hold expired. Status set to cancelled.`,
      metadata: { reason: "hold_expired" },
    });
  }

  let requestQuery = admin
    .from("booking_requests")
    .select("id")
    .eq("status", "on_hold")
    .not("hold_expires_at", "is", null)
    .lte("hold_expires_at", now);

  if (organizationId) {
    requestQuery = requestQuery.eq("organization_id", organizationId);
  }

  const { data: expiredRequests, error: requestReadError } = await requestQuery;
  if (requestReadError && !isMissingDatabaseObject(requestReadError)) {
    throw new Error(requestReadError.message);
  }

  let expiredRequestCount = 0;
  if ((expiredRequests ?? []).length) {
    const ids = expiredRequests!.map((row: { id: string }) => row.id);
    const { data: updated, error: updateError } = await admin
      .from("booking_requests")
      .update({ status: "cancelled", hold_expires_at: null })
      .in("id", ids)
      .eq("status", "on_hold")
      .select("id");
    if (updateError && !isMissingDatabaseObject(updateError)) {
      throw new Error(updateError.message);
    }
    expiredRequestCount = updated?.length ?? 0;
  }

  return {
    expiredEnquiries: expiredEnquiryCount,
    expiredRequests: expiredRequestCount,
  };
}

export { computeHoldExpiresAt, RESERVATION_HOLD_HOURS };
