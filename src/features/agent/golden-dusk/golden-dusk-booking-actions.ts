"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { GoldenDuskApiError } from "@/features/integrations/golden-dusk/client";
import {
  cancelGoldenDuskBooking,
  checkGoldenDuskAccommodationAvailability,
  createGoldenDuskBooking,
  getGoldenDuskBooking,
  listGoldenDuskBookings,
  quoteGoldenDuskBooking,
} from "@/features/integrations/golden-dusk/agent-booking-service";
import {
  markEnquiryCancelledFromGoldenDusk,
  mirrorGoldenDuskBookingToEnquiry,
  syncGoldenDuskBookingMirror,
} from "@/features/integrations/golden-dusk/agent-booking-mirror";
import type { GoldenDuskFinancialDocumentType } from "@/features/integrations/golden-dusk/agent-booking-types";
import { parseGoldenDuskProductId } from "@/features/integrations/golden-dusk/product-external-id";
import {
  getOperatingOrganizationId,
  getProduct,
} from "@/features/products/products-service";

const bookingInputSchema = z.object({
  productId: z.string().uuid(),
  preferredDate: z.iso.date(),
  endDate: z.iso.date().optional(),
  partySize: z.coerce.number().int().min(1).max(100),
  contactName: z.string().trim().min(1).max(150),
  notes: z.string().trim().max(2000).optional(),
  enquiryId: z.string().uuid().optional(),
});

const availabilitySchema = z.object({
  productId: z.string().uuid(),
  checkInDate: z.iso.date(),
  endDate: z.iso.date().optional(),
  rooms: z.coerce.number().int().min(1).max(20).default(1),
});

function nightsBetween(startDate: string, endDate?: string) {
  if (!endDate || endDate === startDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff > 0 ? diff : 1;
}

function mapGoldenDuskError(error: unknown, fallback: string) {
  if (error instanceof GoldenDuskApiError) {
    const notConnected = error.message
      .toLowerCase()
      .includes("connect your golden dusk");
    return { ok: false as const, error: error.message, notConnected };
  }
  const message = error instanceof Error ? error.message : fallback;
  const notConnected = message.toLowerCase().includes("connect your golden dusk");
  return { ok: false as const, error: message, notConnected };
}

async function resolveBookableProduct(organizationId: string, productId: string) {
  const product = await getProduct(
    (await getOperatingOrganizationId()) ?? organizationId,
    productId,
  );
  if (!product) {
    throw new Error("Product not found.");
  }
  const linkage = parseGoldenDuskProductId(product.external_id);
  if (!linkage) {
    throw new Error("This product is not linked to GoldenDusk inventory.");
  }
  return { product, linkage };
}

export async function confirmGoldenDuskProductBooking(
  organizationId: string,
  input: unknown,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false as const, error: "Agent access is required." };
  }

  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid booking request.",
    };
  }

  try {
    const { product, linkage } = await resolveBookableProduct(
      organizationId,
      parsed.data.productId,
    );

    const reservation = await createGoldenDuskBooking({
      membershipId: agent.membership.id,
      partySize: parsed.data.partySize,
      line: {
        productId: linkage.productId,
        productName: product.name,
        productType: linkage.productType,
        preferredDate: parsed.data.preferredDate,
        endDate: parsed.data.endDate,
        quantity:
          linkage.productType === "Accommodation" ? 1 : parsed.data.partySize,
        nights:
          linkage.productType === "Accommodation"
            ? nightsBetween(parsed.data.preferredDate, parsed.data.endDate)
            : undefined,
      },
      customer: {
        contactName: parsed.data.contactName,
        contactEmail: agent.context.email,
        notes: parsed.data.notes,
      },
    });

    const mirrored = await mirrorGoldenDuskBookingToEnquiry({
      organizationId,
      membershipId: agent.membership.id,
      enquiryId: parsed.data.enquiryId,
      contactName: parsed.data.contactName,
      contactEmail: agent.context.email,
      contactPhone: agent.context.phone || null,
      partySize: parsed.data.partySize,
      productInterest: product.name,
      requestedDate: parsed.data.preferredDate,
      notes: parsed.data.notes ?? null,
      reservation,
    });

    revalidatePath("/agent/enquiries");
    revalidatePath("/agent/bookings");
    revalidatePath("/team/bookings");

    return {
      ok: true as const,
      bookingId: reservation.id,
      enquiryId: mirrored.enquiryId,
      reference: mirrored.reference,
      totalAmount: reservation.totalAmount ?? null,
      currencyCode: reservation.currency?.code ?? "USD",
      reservationStatus: reservation.reservationStatus ?? null,
      paymentStatus: reservation.paymentStatus ?? null,
    };
  } catch (error) {
    return mapGoldenDuskError(error, "Unable to confirm this GoldenDusk booking.");
  }
}

export async function quoteGoldenDuskProductBooking(
  organizationId: string,
  input: unknown,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false as const, error: "Agent access is required." };
  }

  const parsed = bookingInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid quote request.",
    };
  }

  try {
    const { product, linkage } = await resolveBookableProduct(
      organizationId,
      parsed.data.productId,
    );

    const quote = await quoteGoldenDuskBooking({
      membershipId: agent.membership.id,
      partySize: parsed.data.partySize,
      line: {
        productId: linkage.productId,
        productName: product.name,
        productType: linkage.productType,
        preferredDate: parsed.data.preferredDate,
        endDate: parsed.data.endDate,
        quantity:
          linkage.productType === "Accommodation" ? 1 : parsed.data.partySize,
        nights:
          linkage.productType === "Accommodation"
            ? nightsBetween(parsed.data.preferredDate, parsed.data.endDate)
            : undefined,
      },
      customer: {
        contactName: parsed.data.contactName,
        contactEmail: agent.context.email,
        notes: parsed.data.notes,
      },
    });

    return {
      ok: true as const,
      totalAmount: quote.totalAmount,
      amountDue: quote.amountDue,
      currencyCode: quote.currencyCode,
      quotedAt: new Date().toISOString(),
    };
  } catch (error) {
    return mapGoldenDuskError(error, "Unable to quote this product.");
  }
}

export async function checkGoldenDuskProductAvailability(
  organizationId: string,
  input: unknown,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false as const, error: "Agent access is required." };
  }

  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid availability request.",
    };
  }

  try {
    const { product, linkage } = await resolveBookableProduct(
      organizationId,
      parsed.data.productId,
    );
    if (linkage.productType !== "Accommodation") {
      return {
        ok: false as const,
        error: "GoldenDusk availability checks apply to accommodation products.",
      };
    }

    const availability = await checkGoldenDuskAccommodationAvailability({
      membershipId: agent.membership.id,
      productId: linkage.productId,
      checkInDate: parsed.data.checkInDate,
      nights: nightsBetween(parsed.data.checkInDate, parsed.data.endDate),
      rooms: parsed.data.rooms,
      isSplit: false,
    });

    return { ok: true as const, availability };
  } catch (error) {
    return mapGoldenDuskError(error, "Unable to check GoldenDusk availability.");
  }
}

export async function loadAgentGoldenDuskBookings(organizationId: string) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false as const, error: "Agent access is required." };
  }

  try {
    const bookings = await listGoldenDuskBookings(agent.membership.id);
    return { ok: true as const, bookings };
  } catch (error) {
    return mapGoldenDuskError(error, "Unable to load GoldenDusk bookings.");
  }
}

export async function refreshGoldenDuskEnquiryMirror(
  organizationId: string,
  input: { enquiryId: string; bookingId: number },
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false as const, error: "Agent access is required." };
  }

  try {
    const reservation = await getGoldenDuskBooking(
      agent.membership.id,
      input.bookingId,
    );
    await syncGoldenDuskBookingMirror({
      organizationId,
      enquiryId: input.enquiryId,
      reservation,
    });
    revalidatePath(`/agent/enquiries/${input.enquiryId}`);
    revalidatePath("/team/bookings");
    return { ok: true as const, reservation };
  } catch (error) {
    return mapGoldenDuskError(error, "Unable to refresh booking status.");
  }
}

export async function cancelGoldenDuskEnquiryBooking(
  organizationId: string,
  input: { enquiryId: string; bookingId: number },
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    return { ok: false as const, error: "Agent access is required." };
  }

  try {
    const reservation = await cancelGoldenDuskBooking(
      agent.membership.id,
      input.bookingId,
    );
    await markEnquiryCancelledFromGoldenDusk({
      organizationId,
      membershipId: agent.membership.id,
      enquiryId: input.enquiryId,
      bookingId: input.bookingId,
      reservation,
    });
    revalidatePath(`/agent/enquiries/${input.enquiryId}`);
    revalidatePath("/agent/bookings");
    revalidatePath("/team/bookings");
    return { ok: true as const };
  } catch (error) {
    return mapGoldenDuskError(error, "Unable to cancel this GoldenDusk booking.");
  }
}