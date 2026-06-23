export interface HaroldWebhookResult {
  reply: string | null;
  handover: boolean;
  handoverReason: string | null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(...values: unknown[]) {
  return (
    values.find((value) => typeof value === "string" && value.trim()) as
      | string
      | undefined
  )?.trim() ?? null;
}

export function normalizeHaroldWebhookResponse(raw: unknown): HaroldWebhookResult {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === "string") {
    return { reply: first.trim() || null, handover: false, handoverReason: null };
  }

  const root = objectValue(first);
  const data = objectValue(root?.data);
  const result = objectValue(root?.result);
  const action = readString(
    root?.action,
    data?.action,
    result?.action,
  )?.toLowerCase();
  const handoverSignal =
    root?.handover ??
    root?.requires_human ??
    root?.escalate ??
    data?.handover ??
    data?.requires_human ??
    result?.handover;
  const handover = Boolean(
    handoverSignal ?? (action === "handover" || action === "escalate"),
  );

  return {
    reply: readString(
      root?.output,
      root?.reply,
      root?.response,
      root?.text,
      root?.message,
      data?.output,
      data?.reply,
      data?.response,
      result?.output,
      result?.reply,
    ),
    handover,
    handoverReason: readString(
      root?.handoverReason,
      root?.handover_reason,
      root?.reason,
      data?.handoverReason,
      data?.reason,
      result?.reason,
    ),
  };
}
