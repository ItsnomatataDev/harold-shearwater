export type GoldenDuskReservationStatus =
  | "Enquiry"
  | "Provisional"
  | "Confirmed"
  | "Closed"
  | "Cancelled";

export type GoldenDuskPaymentStatus =
  | "NotPaid"
  | "Deposited"
  | "FullyPaid"
  | "ShortFall";

export type GoldenDuskFinancialDocumentType =
  | "InvoiceStatement"
  | "FiscalTaxInvoice"
  | "ProformaInvoice"
  | "Quotation"
  | "CancelledInvoice"
  | "Receipt"
  | "DebtorsSalesJournal"
  | "InvoiceStatementExport"
  | "BulkInvoiceExport"
  | "BulkFiscalInvoiceExport";

export interface GoldenDuskReservation {
  id: number;
  totalAmount?: number;
  amountDue?: number | null;
  refundedAmount?: number;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerEmail?: string | null;
  dateOfArrival?: string | null;
  numberOfPeople?: number | null;
  agencyVoucherReference?: string | null;
  agentRef?: string | null;
  tripCode?: string | null;
  invoiceNumber?: number | null;
  reservationStatus?: GoldenDuskReservationStatus | null;
  paymentStatus?: GoldenDuskPaymentStatus | null;
  notes?: string | null;
  currency?: { code?: string | null; id?: number } | null;
  activityReservationProducts?: Array<{
    productId?: number | null;
    productName?: string | null;
    dateOfActivity?: string | null;
    quantity?: number | null;
    totalAmount?: number | null;
  }>;
  accommodationReservationProducts?: Array<{
    productId?: number | null;
    productName?: string | null;
    nights?: number | null;
    quantity?: number | null;
    totalAmount?: number | null;
  }>;
  creationTime?: string | null;
  lastModificationTime?: string | null;
}

export interface GoldenDuskAccommodationAvailability {
  available?: boolean;
  roomsAvailable?: number | null;
  message?: string | null;
  [key: string]: unknown;
}

export interface GoldenDuskBookingLineInput {
  productId: number;
  productName: string;
  productType: "Activity" | "Accommodation";
  preferredDate: string;
  endDate?: string;
  quantity: number;
  childQuantity?: number;
  nights?: number;
}

export interface GoldenDuskBookingCustomerInput {
  contactName: string;
  contactEmail?: string;
  voucherReference?: string;
  notes?: string;
}
