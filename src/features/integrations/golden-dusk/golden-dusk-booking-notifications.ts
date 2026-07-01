import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export async function notifyTeamOfGoldenDuskBookingConfirmed(input: {
  organizationId: string;
  agentUserId: string;
  agentName: string;
  enquiryId: string;
  reference: string;
  contactName: string;
  productInterest: string;
  bookingId: number;
  requestedDate?: string | null;
  totalAmount?: number | null;
  currencyCode?: string | null;
}) {
  const admin = createAdminClient();
  const { data: teamMemberships, error } = await admin
    .from("access_memberships")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("access_type", "team")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const recipients = Array.from(
    new Set(
      (teamMemberships ?? [])
        .map((row) => row.user_id)
        .filter((userId) => userId && userId !== input.agentUserId),
    ),
  );

  if (!recipients.length) return;

  const amount =
    input.totalAmount != null
      ? `${input.currencyCode ?? "USD"} ${input.totalAmount.toLocaleString("en-GB", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : null;

  const travelDate = input.requestedDate
    ? new Date(`${input.requestedDate}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const details = [
    input.productInterest,
    travelDate ? `travel ${travelDate}` : null,
    amount,
  ]
    .filter(Boolean)
    .join(" · ");

  const body = `${input.agentName} confirmed SWAIBMS booking #${input.bookingId} for ${input.contactName}${details ? ` (${details})` : ""}. Harold enquiry ${input.reference} is synced.`;
  const dedupeKey = `golden-dusk-booking:${input.bookingId}`;

  await admin.from("notifications").upsert(
    recipients.map((recipientUserId) => ({
      organization_id: input.organizationId,
      recipient_user_id: recipientUserId,
      category: "booking",
      title: "Agent confirmed SWAIBMS booking",
      body,
      href: `/team/bookings/enquiries/${input.enquiryId}`,
      entity_type: "agent_enquiry",
      entity_id: input.enquiryId,
      dedupe_key: dedupeKey,
      metadata: {
        goldenDuskBookingId: input.bookingId,
        reference: input.reference,
        agentName: input.agentName,
        contactName: input.contactName,
      },
    })),
    { onConflict: "recipient_user_id,dedupe_key", ignoreDuplicates: true },
  );
}
