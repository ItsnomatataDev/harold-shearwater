export const RESERVATION_HOLD_HOURS = 72;
export const RESERVATION_HOLD_MS = RESERVATION_HOLD_HOURS * 60 * 60 * 1000;

export function computeHoldExpiresAt(from = new Date()) {
  return new Date(from.getTime() + RESERVATION_HOLD_MS).toISOString();
}

export function formatHoldExpiry(value: string | null | undefined) {
  if (!value) return null;
  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) return null;

  const remainingMs = expiresAt.getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h remaining`;
  }
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export function formatHoldExpiryDate(value: string | null | undefined) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
