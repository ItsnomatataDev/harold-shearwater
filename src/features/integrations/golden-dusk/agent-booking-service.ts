import "server-only";

import {
  goldenDuskAgentDownload,
  goldenDuskAgentFetch,
} from "./agent-auth-client";
import { getGoldenDuskAccessToken } from "./agent-auth-service";
import {
  getGoldenDuskBookingsCached,
  invalidateGoldenDuskBookingsCache,
} from "./golden-dusk-booking-cache";
import type {
  GoldenDuskAccommodationAvailability,
  GoldenDuskBookingCustomerInput,
  GoldenDuskBookingLineInput,
  GoldenDuskFinancialDocumentType,
  GoldenDuskReservation,
} from "./agent-booking-types";

function splitCustomerName(contactName: string) {
  const trimmed = contactName.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) {
    return { customerFirstName: trimmed, customerLastName: trimmed };
  }
  return {
    customerFirstName: trimmed.slice(0, space),
    customerLastName: trimmed.slice(space + 1).trim() || trimmed,
  };
}

function nightsBetween(startDate: string, endDate?: string) {
  if (!endDate || endDate === startDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff > 0 ? diff : 1;
}

export function buildGoldenDuskReservationPayload(input: {
  agencyId: number;
  agencyConsultantId: number | null;
  line: GoldenDuskBookingLineInput;
  customer: GoldenDuskBookingCustomerInput;
  partySize: number;
}) {
  const names = splitCustomerName(input.customer.contactName);
  const payload: Record<string, unknown> = {
    agencyId: input.agencyId,
    agencyConsultantId: input.agencyConsultantId,
    customerFirstName: names.customerFirstName,
    customerLastName: names.customerLastName,
    customerEmail: input.customer.contactEmail ?? null,
    numberOfPeople: input.partySize,
    saleType: "NetRate",
    channel: "FIT",
    dateOfArrival: input.line.preferredDate,
    notes: input.customer.notes ?? null,
    agencyVoucherReference: input.customer.voucherReference ?? null,
  };

  if (input.line.productType === "Activity") {
    payload.activityReservationProducts = [
      {
        productId: input.line.productId,
        productName: input.line.productName,
        dateOfActivity: input.line.preferredDate,
        quantity: input.line.quantity,
        childQuantity: input.line.childQuantity ?? 0,
        productType: "Activity",
      },
    ];
  } else {
    payload.accommodationReservationProducts = [
      {
        productId: input.line.productId,
        productName: input.line.productName,
        nights: input.line.nights ?? nightsBetween(input.line.preferredDate, input.line.endDate),
        quantity: input.line.quantity,
        productType: "Accommodation",
      },
    ];
  }

  return payload;
}

async function withGoldenDuskSession<T>(
  membershipId: string,
  work: (token: string, connection: NonNullable<Awaited<ReturnType<typeof getGoldenDuskAccessToken>>>) => Promise<T>,
): Promise<T> {
  const session = await getGoldenDuskAccessToken(membershipId);
  if (!session) {
    throw new Error(
      "Your SWAIBMS session expired. Sign in again as a travel agent to book.",
    );
  }
  return work(session.token, session);
}

export async function quoteGoldenDuskBooking(input: {
  membershipId: string;
  line: GoldenDuskBookingLineInput;
  customer: GoldenDuskBookingCustomerInput;
  partySize: number;
}) {
  return withGoldenDuskSession(input.membershipId, async (token, { connection }) => {
    const payload = buildGoldenDuskReservationPayload({
      agencyId: connection.golden_dusk_agency_id,
      agencyConsultantId: connection.golden_dusk_consultant_id,
      line: input.line,
      customer: input.customer,
      partySize: input.partySize,
    });

    const quoted = await goldenDuskAgentFetch<GoldenDuskReservation>(
      "/agent/bookings/quote",
      { method: "POST", token, body: payload },
    );

    return {
      totalAmount: quoted.totalAmount ?? 0,
      amountDue: quoted.amountDue ?? quoted.totalAmount ?? 0,
      currencyCode: quoted.currency?.code ?? "USD",
      reservation: quoted,
    };
  });
}

export async function createGoldenDuskBooking(input: {
  membershipId: string;
  line: GoldenDuskBookingLineInput;
  customer: GoldenDuskBookingCustomerInput;
  partySize: number;
}) {
  return withGoldenDuskSession(input.membershipId, async (token, { connection }) => {
    const payload = buildGoldenDuskReservationPayload({
      agencyId: connection.golden_dusk_agency_id,
      agencyConsultantId: connection.golden_dusk_consultant_id,
      line: input.line,
      customer: input.customer,
      partySize: input.partySize,
    });

    return goldenDuskAgentFetch<GoldenDuskReservation>("/agent/bookings", {
      method: "POST",
      token,
      body: payload,
    });
  }).finally(() => invalidateGoldenDuskBookingsCache(input.membershipId));
}

export async function listGoldenDuskBookings(
  membershipId: string,
  options?: { refresh?: boolean },
) {
  return getGoldenDuskBookingsCached(
    membershipId,
    () =>
      withGoldenDuskSession(membershipId, async (token) => {
        const data = await goldenDuskAgentFetch<
          GoldenDuskReservation[] | GoldenDuskReservation
        >("/agent/bookings", { token });
        return Array.isArray(data) ? data : data ? [data] : [];
      }),
    options,
  );
}

export async function getGoldenDuskBooking(
  membershipId: string,
  bookingId: number,
) {
  return withGoldenDuskSession(membershipId, async (token) =>
    goldenDuskAgentFetch<GoldenDuskReservation>(`/agent/bookings/${bookingId}`, {
      token,
    }),
  );
}

export async function cancelGoldenDuskBooking(
  membershipId: string,
  bookingId: number,
) {
  return withGoldenDuskSession(membershipId, async (token) =>
    goldenDuskAgentFetch<GoldenDuskReservation>(
      `/agent/bookings/${bookingId}/cancel`,
      { method: "POST", token, body: {} },
    ),
  ).finally(() => invalidateGoldenDuskBookingsCache(membershipId));
}

export async function checkGoldenDuskAccommodationAvailability(input: {
  membershipId: string;
  productId: number;
  checkInDate: string;
  nights: number;
  rooms?: number;
  isSplit?: boolean;
}) {
  return withGoldenDuskSession(input.membershipId, async (token) => {
    const params = new URLSearchParams({
      productId: String(input.productId),
      checkInDate: input.checkInDate,
      nights: String(input.nights),
      rooms: String(input.rooms ?? 1),
      isSplit: String(input.isSplit ?? false),
    });
    return goldenDuskAgentFetch<GoldenDuskAccommodationAvailability>(
      `/agent/bookings/availability?${params.toString()}`,
      { token },
    );
  });
}

export async function downloadGoldenDuskBookingDocument(input: {
  membershipId: string;
  bookingId: number;
  documentType: GoldenDuskFinancialDocumentType;
}) {
  return withGoldenDuskSession(input.membershipId, async (token) =>
    goldenDuskAgentDownload(
      `/agent/bookings/${input.bookingId}/documents/${input.documentType}`,
      token,
    ),
  );
}
