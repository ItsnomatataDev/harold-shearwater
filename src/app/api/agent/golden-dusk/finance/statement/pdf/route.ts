import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import {
  downloadGoldenDuskFinanceStatementPdf,
  normalizeFinanceDateRange,
} from "@/features/integrations/golden-dusk/agent-finance-service";

const querySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  currencyId: z.coerce.number().int().positive().optional(),
});

function statementPdfErrorMessage(message: string) {
  if (message.toLowerCase().includes("no invoiced bookings")) {
    return "No invoiced bookings were found for this date range. Widen the dates on the finance page, or check the Statement and Invoices tabs for lines in range.";
  }
  return message;
}

export async function GET(request: Request) {
  const agent = await requireAgentContext();
  if (!agent?.membership.id) {
    return NextResponse.json({ error: "Agent access is required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    currencyId: url.searchParams.get("currencyId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid statement request." }, { status: 400 });
  }

  const range = normalizeFinanceDateRange({
    from: parsed.data.from,
    to: parsed.data.to,
  });

  try {
    const file = await downloadGoldenDuskFinanceStatementPdf({
      membershipId: agent.membership.id,
      range,
      currencyId: parsed.data.currencyId,
    });

    const fileName = file.fileName ?? "swaibms-statement.pdf";

    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to download statement.";
    const friendly = statementPdfErrorMessage(message);
    const emptyReport = message.toLowerCase().includes("no invoiced bookings");
    return NextResponse.json(
      { error: friendly },
      { status: emptyReport ? 404 : 502 },
    );
  }
}
