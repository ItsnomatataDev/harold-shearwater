import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import {
  AvailabilityCheck,
  type RoomMetaMap,
} from "@/features/booking/AvailabilityCheck";
import { getAvailabilityRoomProducts } from "@/features/products/products-service";
import { getAvailabilityRoomRateHints } from "@/features/products/product-rates-service";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";

export const metadata: Metadata = { title: "Availability — Agent" };

export default async function AgentSearchPage() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const [rooms, roomRates] = await Promise.all([
    getAvailabilityRoomProducts(),
    getAvailabilityRoomRateHints(agent.membership.id),
  ]);
  const roomMeta: RoomMetaMap = Object.fromEntries(
    Object.values(rooms)
      .filter((room): room is NonNullable<typeof room> => Boolean(room))
      .map((room) => [
        room.unitKey,
        {
          href: `/agent/products/${room.id}`,
          description: room.shortDescription,
          productId: room.id,
          productName: room.name,
          fromRate: roomRates[room.unitKey],
        },
      ]),
  );

  return (
    <div className="shell-content space-y-6">
      <HaroldModuleContext
        moduleId="availability"
        summary="Agent is checking live room type availability"
      />
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Agent Portal
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Check availability
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          See how many units are free in each room type for your dates. Counts
          are per category — not individual room numbers. Exact rooms are
          assigned when Shearwater confirms the booking.
        </p>
      </header>

      <AvailabilityCheck roomMeta={roomMeta} organizationId={agent.membership.organizationId} />
    </div>
  );
}
