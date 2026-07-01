import { NextResponse } from "next/server";
import { expireReservationHolds } from "@/features/booking/reservation-hold-service";

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

  let organizationId: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.organizationId && typeof body.organizationId === "string") {
      organizationId = body.organizationId;
    }
  } catch {
    // Optional body — expire all orgs when omitted.
  }

  const result = await expireReservationHolds(organizationId);
  return NextResponse.json({ ok: true, ...result });
}
