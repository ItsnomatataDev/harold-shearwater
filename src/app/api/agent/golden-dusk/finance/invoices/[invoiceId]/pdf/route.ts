import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { downloadGoldenDuskFinanceInvoicePdf } from "@/features/integrations/golden-dusk/agent-finance-service";

const paramsSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
});

const querySchema = z.object({
  currencyId: z.coerce.number().int().positive().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ invoiceId: string }> },
) {
  const agent = await requireAgentContext();
  if (!agent?.membership.id) {
    return NextResponse.json({ error: "Agent access is required." }, { status: 401 });
  }

  const rawParams = await context.params;
  const parsedParams = paramsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid invoice request." }, { status: 400 });
  }

  const url = new URL(request.url);
  const parsedQuery = querySchema.safeParse({
    currencyId: url.searchParams.get("currencyId") ?? undefined,
  });

  try {
    const file = await downloadGoldenDuskFinanceInvoicePdf({
      membershipId: agent.membership.id,
      invoiceId: parsedParams.data.invoiceId,
      currencyId: parsedQuery.success ? parsedQuery.data.currencyId : undefined,
    });

    const fileName =
      file.fileName ?? `swaibms-invoice-${parsedParams.data.invoiceId}.pdf`;

    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to download invoice.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
