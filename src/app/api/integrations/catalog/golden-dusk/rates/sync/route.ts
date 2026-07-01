import { NextResponse } from "next/server";
import { z } from "zod";
import { syncGoldenDuskRates } from "@/features/integrations/golden-dusk/rates-sync";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  year: z.number().int().min(2000).max(2100).optional(),
  defaultAgentRateType: z.string().min(1).optional(),
});

function authorize(request: Request) {
  const configuredSecret = process.env.INTEGRATION_API_SECRET?.trim();
  if (!configuredSecret) {
    return NextResponse.json(
      { error: "Integration endpoint is not configured." },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("x-integration-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!provided || provided !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  const unauthorized = authorize(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid rates sync payload." },
      { status: 400 },
    );
  }

  try {
    const result = await syncGoldenDuskRates(parsed.data.organizationId, {
      year: parsed.data.year,
      defaultAgentRateType: parsed.data.defaultAgentRateType,
    });

    return NextResponse.json({
      ok: result.failed === 0,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "GoldenDusk rates sync failed.",
      },
      { status: 500 },
    );
  }
}
