import {
  formatHoldExpiry,
  formatHoldExpiryDate,
  RESERVATION_HOLD_HOURS,
} from "@/features/booking/reservation-holds";

export function ReservationHoldBanner({
  holdExpiresAt,
  status,
}: {
  holdExpiresAt: string | null;
  status: string;
}) {
  if (status !== "on_hold" || !holdExpiresAt) return null;

  const remaining = formatHoldExpiry(holdExpiresAt);
  const expiresLabel = formatHoldExpiryDate(holdExpiresAt);

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-gold">
        {RESERVATION_HOLD_HOURS}-hour reservation hold
      </p>
      <p className="mt-1 text-sm text-[#e8dcc0]">
        {remaining ?? "Active"} · expires {expiresLabel ?? holdExpiresAt}
      </p>
    </div>
  );
}
