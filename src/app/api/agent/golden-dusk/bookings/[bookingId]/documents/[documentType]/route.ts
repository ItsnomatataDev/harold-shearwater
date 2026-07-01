import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { downloadGoldenDuskBookingDocument } from "@/features/integrations/golden-dusk/agent-booking-service";
import type { GoldenDuskFinancialDocumentType } from "@/features/integrations/golden-dusk/agent-booking-types";

const paramsSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  documentType: z.enum([
    "InvoiceStatement",
    "FiscalTaxInvoice",
    "ProformaInvoice",
    "Quotation",
    "CancelledInvoice",
    "Receipt",
    "DebtorsSalesJournal",
    "InvoiceStatementExport",
    "BulkInvoiceExport",
    "BulkFiscalInvoiceExport",
  ]),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookingId: string; documentType: string }> },
) {
  const agent = await requireAgentContext();
  if (!agent?.membership.id) {
    return NextResponse.json({ error: "Agent access is required." }, { status: 401 });
  }

  const rawParams = await context.params;
  const parsed = paramsSchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid document request." }, { status: 400 });
  }

  try {
    const file = await downloadGoldenDuskBookingDocument({
      membershipId: agent.membership.id,
      bookingId: parsed.data.bookingId,
      documentType: parsed.data.documentType as GoldenDuskFinancialDocumentType,
    });

    const fileName =
      file.fileName ??
      `golden-dusk-${parsed.data.bookingId}-${parsed.data.documentType}.pdf`;

    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to download document.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
