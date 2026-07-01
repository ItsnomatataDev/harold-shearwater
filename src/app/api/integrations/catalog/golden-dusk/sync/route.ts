import { NextResponse } from "next/server";
import { z } from "zod";
import { syncGoldenDuskCatalog } from "@/features/integrations/golden-dusk/catalog-sync";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
  includeAccommodation: z.boolean().optional(),
  includeActivities: z.boolean().optional(),
  activitiesAvailableOnly: z.boolean().optional(),
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
      { error: parsed.error.issues[0]?.message ?? "Invalid sync payload." },
      { status: 400 },
    );
  }

  try {
    const result = await syncGoldenDuskCatalog(parsed.data.organizationId, {
      includeAccommodation: parsed.data.includeAccommodation,
      includeActivities: parsed.data.includeActivities,
      activitiesAvailableOnly: parsed.data.activitiesAvailableOnly,
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
            : "GoldenDusk catalog sync failed.",
      },
      { status: 500 },
    );
  }
}
