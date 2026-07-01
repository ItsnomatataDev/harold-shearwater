import type { GoldenDuskFinancialDocumentType } from "@/features/integrations/golden-dusk/agent-booking-types";

export function goldenDuskDocumentHref(
  bookingId: number,
  documentType: GoldenDuskFinancialDocumentType,
) {
  return `/api/agent/golden-dusk/bookings/${bookingId}/documents/${documentType}`;
}
