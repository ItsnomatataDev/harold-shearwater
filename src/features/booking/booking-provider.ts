import "server-only";

export interface AvailabilitySearchInput {
  organizationId: string;
  productId: string;
  date: string;
  partySize: number;
}

export interface AvailabilitySlot {
  externalId: string;
  startsAt: string;
  remainingCapacity: number | null;
  pricePerPerson: number | null;
  currency: string | null;
}

export interface BookingQuoteInput extends AvailabilitySearchInput {
  slotExternalId: string;
  agentMembershipId: string;
}

export interface BookingQuote {
  externalQuoteId: string;
  total: number;
  currency: string;
  expiresAt: string | null;
}

export interface BookingConfirmation {
  externalBookingReference: string;
  status: "held" | "confirmed";
  voucherUrl: string | null;
}

export interface BookingProvider {
  readonly name: string;
  readonly configured: boolean;
  searchAvailability(input: AvailabilitySearchInput): Promise<AvailabilitySlot[]>;
  createQuote(input: BookingQuoteInput): Promise<BookingQuote>;
  createHold(externalQuoteId: string): Promise<BookingConfirmation>;
  confirmBooking(externalQuoteId: string): Promise<BookingConfirmation>;
  cancelBooking(externalBookingReference: string): Promise<void>;
}

export class BookingProviderUnavailableError extends Error {
  constructor() {
    super("Live booking is not connected yet. The Agent workflow is ready for a booking provider adapter.");
    this.name = "BookingProviderUnavailableError";
  }
}

class UnconfiguredBookingProvider implements BookingProvider {
  readonly name = "Not connected";
  readonly configured = false;

  async searchAvailability(): Promise<AvailabilitySlot[]> {
    throw new BookingProviderUnavailableError();
  }
  async createQuote(): Promise<BookingQuote> {
    throw new BookingProviderUnavailableError();
  }
  async createHold(): Promise<BookingConfirmation> {
    throw new BookingProviderUnavailableError();
  }
  async confirmBooking(): Promise<BookingConfirmation> {
    throw new BookingProviderUnavailableError();
  }
  async cancelBooking(): Promise<void> {
    throw new BookingProviderUnavailableError();
  }
}

export function getBookingProvider(): BookingProvider {
  // The future Activitar or alternative adapter is selected here. Components
  // and Agent workflows never import a provider SDK directly.
  return new UnconfiguredBookingProvider();
}
