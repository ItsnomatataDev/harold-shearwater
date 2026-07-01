import "server-only";

import type { AvailabilityResult } from "@/features/booking/availability-shared";
import { AVAILABILITY_UNIT_TYPES } from "@/features/booking/availability-shared";
import { fetchAvailability } from "@/features/booking/availability-service";
import { getGoldenDuskConnectionSummary } from "./agent-auth-service";
import {
  fetchGoldenDuskAllRoomTypesAvailabilityRange,
  fetchGoldenDuskProductAvailabilityRange,
} from "./golden-dusk-availability-service";
import { productUsesGoldenDuskAvailability } from "./product-external-id";

export type ResolvedAvailability = AvailabilityResult & {
  source: "public" | "golden-dusk";
  truncated?: boolean;
};

export function formatAvailabilitySnapshotNote(
  snapshot: ResolvedAvailability | null,
  optionLabel?: string,
) {
  if (!snapshot?.days.length) return null;

  const labelByKey = new Map(
    AVAILABILITY_UNIT_TYPES.map((unit) => [unit.key, unit.label]),
  );
  const sourceLabel =
    snapshot.source === "golden-dusk" ? "SWAIBMS availability" : "Availability";

  const lines = snapshot.days.map((day) => {
    const units = Object.entries(day.units)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => `${labelByKey.get(key as keyof typeof day.units) ?? key}: ${count}`)
      .join(", ");
    return `${day.date}: ${units || "no availability"}`;
  });

  const header = optionLabel
    ? `${sourceLabel} snapshot (${optionLabel}):`
    : `${sourceLabel} snapshot:`;

  const truncatedNote = snapshot.truncated
    ? "\n(Partial range — SWAIBMS limits longer searches.)"
    : "";

  return `${header}\n${lines.join("\n")}${truncatedNote}`;
}

export async function resolveLiveAvailability(input: {
  startDate: string;
  endDate: string;
  membershipId?: string | null;
  product?: { external_id?: string | null; variants?: { name: string }[] };
  nights?: number;
  rooms?: number;
}): Promise<ResolvedAvailability | null> {
  if (input.membershipId) {
    const connection = await getGoldenDuskConnectionSummary(input.membershipId);
    if (connection.connected) {
      try {
        if (input.product && productUsesGoldenDuskAvailability(input.product)) {
          return await fetchGoldenDuskProductAvailabilityRange({
            membershipId: input.membershipId,
            product: {
              external_id: input.product.external_id,
              variants: input.product.variants ?? [],
            },
            startDate: input.startDate,
            endDate: input.endDate,
            nights: input.nights ?? 1,
            rooms: input.rooms ?? 1,
          });
        }

        return await fetchGoldenDuskAllRoomTypesAvailabilityRange({
          membershipId: input.membershipId,
          startDate: input.startDate,
          endDate: input.endDate,
          nights: input.nights ?? 1,
          rooms: input.rooms ?? 1,
        });
      } catch {
        // Fall back to the public feed if SWAIBMS is temporarily unavailable.
      }
    }
  }

  try {
    const result = await fetchAvailability(input.startDate, input.endDate);
    return { ...result, source: "public" };
  } catch {
    return null;
  }
}
