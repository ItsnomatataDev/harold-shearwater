import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertExternalRatePlan } from "@/features/integrations/catalog/catalog-sync-service";

const organizationSchema = z.object({
  organizationId: z.string().uuid(),
});

const ratePlanSchema = z.object({
  externalId: z.string().min(1),
  externalSource: z.enum(["manual", "activitar", "api"]).optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  planType: z
    .enum(["public", "agent_default", "agency_specific", "staff", "promotional"])
    .optional(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  active: z.boolean().optional(),
  items: z
    .array(
      z.object({
        productExternalId: z.string().min(1),
        variantExternalId: z.string().nullable().optional(),
        pricePerPerson: z.number().nonnegative(),
        currency: z.string().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .optional(),
  agencyExternalIds: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
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
  const organization = organizationSchema.safeParse(body);
  if (!organization.success) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const payload = ratePlanSchema.safeParse(body?.ratePlan ?? body);
  if (!payload.success) {
    return NextResponse.json(
      { error: payload.error.issues[0]?.message ?? "Invalid rate plan payload." },
      { status: 400 },
    );
  }

  try {
    const result = await upsertExternalRatePlan(
      organization.data.organizationId,
      payload.data,
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate plan sync failed." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  return POST(request);
}
