import "server-only";

import { AVAILABILITY_UNIT_TYPES } from "@/features/booking/availability-shared";
import { resolveLiveAvailability } from "@/features/integrations/golden-dusk/availability-resolver";
import { getAvailabilityRoomProducts } from "@/features/products/products-service";
import type { HaroldWebhookModuleContext } from "@/features/team/harold/harold-webhook";

function todayIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** If the user typed an ISO date (2026-07-05), check that day only. */
export function extractDateRangeFromMessage(
  message: string,
): { startDate: string; endDate: string } | null {
  const match = message.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (!match) return null;
  return { startDate: match[1], endDate: match[1] };
}

export type HaroldAvailabilityModel = {
  level: "room_type_aggregate";
  canShowIndividualRoomNumbers: false;
  roomTypeCount: 5;
  explanation: string;
  bookingFlow: string;
  whatYouCanAnswer: string[];
  whatYouCannotAnswer: string[];
};

export type HaroldRoomTypeDay = {
  key: string;
  label: string;
  unitsLeft: number;
  available: boolean;
  meaning: string;
  productId: string | null;
  productName: string;
};

export type HaroldLiveAvailability = {
  source: string;
  fetchedAt: string;
  startDate: string;
  endDate: string;
  authoritative: true;
  model: HaroldAvailabilityModel;
  assistantBrief: string;
  instructions: string[];
  roomTypes: Array<{
    key: string;
    label: string;
    productId: string | null;
    productName: string;
  }>;
  days: Array<{
    date: string;
    roomTypes: HaroldRoomTypeDay[];
  }>;
  summary: string;
  ratesAvailable: false;
};

function buildAvailabilityModel(): HaroldAvailabilityModel {
  return {
    level: "room_type_aggregate",
    canShowIndividualRoomNumbers: false,
    roomTypeCount: AVAILABILITY_UNIT_TYPES.length,
    explanation:
      "Availability is reported per room TYPE (category), not per individual physical room number. For example, Deluxe Double: 11 means eleven Deluxe Double units are free that day — not Room 204 or Room 205.",
    bookingFlow:
      "Agents and guests request a room type and dates. Shearwater reservations confirm the exact room allocation later. Do not promise a specific room number.",
    whatYouCanAnswer: [
      "How many units are left in each room type on a date",
      "Which room types are fully booked",
      "Whether a room type has any availability on given dates",
      "Direct users to the room type product page for details and booking requests",
    ],
    whatYouCannotAnswer: [
      "Which exact room number is free (e.g. Room 12 vs Room 14)",
      "Which specific unit inside a room type is booked",
      "Prices or rates until ratesAvailable becomes true",
    ],
  };
}

function unitMeaning(label: string, unitsLeft: number): string {
  if (unitsLeft <= 0) {
    return `${label} is fully booked for this date.`;
  }
  return `${unitsLeft} unit${unitsLeft === 1 ? "" : "s"} of ${label} available. Exact room numbers are assigned at confirmation — not shown in the API.`;
}

function buildAssistantBrief(
  model: HaroldAvailabilityModel,
  days: HaroldLiveAvailability["days"],
  startDate: string,
  endDate: string,
  source: "public" | "golden-dusk",
): string {
  const lines = [
    source === "golden-dusk"
      ? "=== SHEARWATER LIVE AVAILABILITY (SWAIBMS — AUTHORITATIVE) ==="
      : "=== SHEARWATER LIVE AVAILABILITY (AUTHORITATIVE) ===",
    model.explanation,
    model.bookingFlow,
    "",
    `Date range: ${startDate} to ${endDate}`,
    "",
    "Current availability by room type:",
    ...days.map((day) => {
      const parts = day.roomTypes
        .filter((rt) => rt.available)
        .map((rt) => `${rt.label}: ${rt.unitsLeft} units left`);
      return `${day.date}: ${parts.length ? parts.join("; ") : "all room types fully booked"}`;
    }),
    "",
    "Room types: Standard Twin, Standard Double, Deluxe Twin, Deluxe Double, Dome Tent.",
    "Never invent counts. Never name specific room numbers. Rates are not available yet.",
  ];
  return lines.join("\n");
}

export async function buildHaroldAvailabilityContext(
  message?: string,
  options?: { membershipId?: string | null },
): Promise<HaroldLiveAvailability> {
  const extracted = message ? extractDateRangeFromMessage(message) : null;
  const startDate = extracted?.startDate ?? todayIso();
  const endDate = extracted?.endDate ?? todayIso(14);
  const model = buildAvailabilityModel();

  const [result, roomProducts] = await Promise.all([
    resolveLiveAvailability({
      startDate,
      endDate,
      membershipId: options?.membershipId,
    }),
    getAvailabilityRoomProducts(),
  ]);

  if (!result) {
    throw new Error("Unable to load live availability right now.");
  }

  const catalogRoomTypes = AVAILABILITY_UNIT_TYPES.map((unit) => ({
    key: unit.key,
    label: unit.label,
    productId: roomProducts[unit.key]?.id ?? null,
    productName: roomProducts[unit.key]?.name ?? unit.label,
  }));

  const days = result.days.map((day) => ({
    date: day.date,
    roomTypes: result.unitTypes.map((unit) => {
      const unitsLeft = day.units[unit.key];
      const catalog = catalogRoomTypes.find((rt) => rt.key === unit.key);
      return {
        key: unit.key,
        label: unit.label,
        unitsLeft,
        available: unitsLeft > 0,
        meaning: unitMeaning(unit.label, unitsLeft),
        productId: catalog?.productId ?? null,
        productName: catalog?.productName ?? unit.label,
      };
    }),
  }));

  const summaryLines = days.map((day) => {
    const free = day.roomTypes
      .filter((rt) => rt.available)
      .map((rt) => `${rt.label}: ${rt.unitsLeft} units left`);
    return `${day.date} — ${free.length ? free.join(", ") : "all room types fully booked"}`;
  });

  const liveAvailability: HaroldLiveAvailability = {
    source:
      result.source === "golden-dusk"
        ? "SWAIBMS agent API (/agent/bookings/availability)"
        : process.env.AVAILABILITY_API_URL?.trim() ||
          "https://swagoldendusk.xyz/api/availability",
    fetchedAt: new Date().toISOString(),
    startDate: result.startDate,
    endDate: result.endDate,
    authoritative: true,
    ratesAvailable: false,
    model,
    assistantBrief: buildAssistantBrief(
      model,
      days,
      result.startDate,
      result.endDate,
      result.source,
    ),
    instructions: [
      "liveAvailability is authoritative for room TYPE counts only — never invent availability.",
      result.source === "golden-dusk"
        ? "Counts come from SWAIBMS for the signed-in agent session."
        : "Counts come from the public availability feed.",
      "unitsLeft means how many units of that room type are free, NOT a specific room number.",
      "canShowIndividualRoomNumbers is false — never say Room 101, Room 204, etc.",
      "If asked for a specific room number, explain that Shearwater assigns the exact room at confirmation.",
      "Use roomTypes[].productId to suggest viewing the room type detail page when helpful.",
      "If the user asks about dates outside startDate–endDate, ask them to provide dates.",
      "ratesAvailable is false — do not quote prices until rates are connected.",
    ],
    roomTypes: catalogRoomTypes,
    days,
    summary: summaryLines.join("\n"),
  };

  return liveAvailability;
}

/**
 * Attach authoritative live availability to every Harold webhook payload so n8n
 * can answer availability questions without guessing room numbers.
 */
export async function augmentHaroldModuleWithAvailability(
  module: HaroldWebhookModuleContext | undefined,
  message: string,
  options?: { membershipId?: string | null },
): Promise<HaroldWebhookModuleContext> {
  const liveAvailability = await buildHaroldAvailabilityContext(
    message,
    options,
  );
  const base: HaroldWebhookModuleContext = module ?? {
    id: "general",
    label: "General",
    summary: "General assistance across the portal.",
  };

  return {
    ...base,
    capabilities: [
      ...(base.capabilities ?? []),
      "Report live room type availability (units left per category)",
      "Explain which room types are fully booked",
      "Clarify that exact room numbers are assigned at confirmation",
    ],
    data: {
      ...(base.data ?? {}),
      liveAvailability,
      assistantBrief: liveAvailability.assistantBrief,
    },
  };
}
