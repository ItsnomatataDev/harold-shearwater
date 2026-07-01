import { Icon } from "@/components/Icon";
import { ROOM_TYPE_AVAILABILITY_NOTICE } from "./availability-shared";

export function RoomTypeAvailabilityNotice({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border border-[#2f2f2b] bg-[#141412] ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <Icon
        name="alertCircle"
        className={`shrink-0 text-savannah ${compact ? "mt-0.5 h-3.5 w-3.5" : "mt-0.5 h-4 w-4"}`}
      />
      <p
        className={`leading-5 text-[#9b9b94] ${compact ? "text-[11px]" : "text-xs"}`}
      >
        {ROOM_TYPE_AVAILABILITY_NOTICE}
      </p>
    </div>
  );
}
