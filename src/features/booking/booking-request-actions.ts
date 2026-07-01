"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  requireAccessContext,
  requireAgentContext,
} from "@/features/auth/services/auth-context";
import { addAgentEnquiry } from "@/features/agent/enquiries/enquiries-actions";
import {
  formatAvailabilitySnapshotNote,
  resolveLiveAvailability,
} from "@/features/integrations/golden-dusk/availability-resolver";
import { getOperatingOrganizationId, getProduct } from "@/features/products/products-service";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";

const bookingSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string().trim().min(1).max(200),
  preferredDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  partySize: z.coerce.number().int().min(1).max(100).default(1),
  optionLabel: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
  contactName: z.string().trim().min(1).max(150).optional(),
});

export type BookingRequestResponse =
  | { ok: true; reference: string; enquiryId?: string }
  | { ok: false; error: string };

function buildReference() {
  return `SW-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function loadAvailabilitySnapshot(input: {
  preferredDate?: string;
  endDate?: string;
  membershipId?: string;
  productId?: string;
  organizationId?: string;
}) {
  if (!input.preferredDate) return null;

  let product: { external_id?: string | null; variants?: { name: string }[] } | undefined;
  if (input.productId) {
    const orgId =
      input.organizationId ?? (await getOperatingOrganizationId()) ?? undefined;
    if (orgId) {
      const loaded = await getProduct(orgId, input.productId);
      if (loaded) {
        product = { external_id: loaded.external_id, variants: [] };
      }
    }
  }

  return resolveLiveAvailability({
    startDate: input.preferredDate,
    endDate: input.endDate ?? input.preferredDate,
    membershipId: input.membershipId,
    product,
  });
}

export async function submitCustomerBookingRequest(
  input: unknown,
): Promise<BookingRequestResponse> {
  const customer = await requireAccessContext("customer");
  if (!customer) {
    return { ok: false, error: "Please sign in to request a booking." };
  }

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid booking request.",
    };
  }

  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) {
    return { ok: false, error: "The operator catalog is not configured yet." };
  }

  const reference = buildReference();
  const snapshot = await loadAvailabilitySnapshot({
    preferredDate: parsed.data.preferredDate,
    endDate: parsed.data.endDate,
  });

  const supabase = await createClient();
  const { error } = await (supabase as any).from("booking_requests").insert({
    organization_id: organizationId,
    membership_id: customer.membership.id,
    access_type: "customer",
    product_id: parsed.data.productId,
    product_name: parsed.data.productName,
    preferred_date: parsed.data.preferredDate ?? null,
    end_date: parsed.data.endDate ?? null,
    party_size: parsed.data.partySize,
    option_label: parsed.data.optionLabel ?? null,
    notes: parsed.data.notes ?? null,
    availability_snapshot: snapshot ?? {},
    reference,
  });

  if (error) {
    if (isMissingDatabaseObject(error)) {
      return {
        ok: false,
        error:
          "Booking requests are not enabled yet. Apply the latest database migration.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/customer/bookings");
  return { ok: true, reference };
}

export async function submitAgentProductBookingRequest(
  organizationId: string,
  input: unknown,
): Promise<BookingRequestResponse> {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false, error: "Agent access is required." };
  }

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid booking request.",
    };
  }

  const contactName =
    parsed.data.contactName?.trim() ||
    `${agent.context.firstName} ${agent.context.lastName}`.trim() ||
    agent.context.email;

  const snapshot = await loadAvailabilitySnapshot({
    preferredDate: parsed.data.preferredDate,
    endDate: parsed.data.endDate,
    membershipId: agent.membership.id,
    productId: parsed.data.productId,
    organizationId,
  });
  const availabilityNote = formatAvailabilitySnapshotNote(
    snapshot,
    parsed.data.optionLabel,
  );
  const combinedNotes = [parsed.data.notes, availabilityNote]
    .filter(Boolean)
    .join("\n\n");

  try {
    const enquiry = await addAgentEnquiry(organizationId, {
      contactName,
      contactEmail: agent.context.email,
      contactPhone: agent.context.phone || undefined,
      partySize: parsed.data.partySize,
      productInterest: parsed.data.productName,
      requestedDate: parsed.data.preferredDate,
      notes: combinedNotes || undefined,
      status: "reservation_requested",
    });
    revalidatePath("/agent/enquiries");
    return { ok: true, reference: enquiry.reference, enquiryId: enquiry.id };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to create enquiry.",
    };
  }
}
