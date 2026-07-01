import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCatalogRateLinkage } from "@/features/integrations/catalog/catalog-linkage-service";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
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
      { error: parsed.error.issues[0]?.message ?? "organizationId is required." },
      { status: 400 },
    );
  }

  try {
    const report = await verifyCatalogRateLinkage(parsed.data.organizationId);
    return NextResponse.json({ ok: report.ok, report });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Catalog linkage verification failed.",
      },
      { status: 500 },
    );
  }
}
