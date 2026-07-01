export type HaroldHandoverDomain =
  | "commercial"
  | "reservations"
  | "guest_relations"
  | "operations"
  | "general";

export type HaroldLanguageQuality = "clear" | "unclear" | "poor";

export interface HaroldSuggestedAction {
  type: string;
  label: string;
}

export interface HaroldWebhookResult {
  reply: string | null;
  handover: boolean;
  handoverReason: string | null;
  /** High-level intent Harold detected (e.g. "product_question", "booking"). */
  intent: string | null;
  /** 0..1 confidence Harold has in its own answer. */
  confidence: number | null;
  /** How understandable the user's message was (helps with poor English). */
  languageQuality: HaroldLanguageQuality | null;
  /** Structured details Harold pulled out of the message/context. */
  entities: Record<string, unknown> | null;
  /** Non-destructive things Harold suggests the user/staff could do next. */
  suggestedActions: HaroldSuggestedAction[];
  /** Which team capability should receive a handover, when relevant. */
  handoverDomain: HaroldHandoverDomain | null;
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

function readNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function readLanguageQuality(value: unknown): HaroldLanguageQuality | null {
  const text = readString(value)?.toLowerCase();
  if (text === "clear" || text === "unclear" || text === "poor") return text;
  return null;
}

function readHandoverDomain(value: unknown): HaroldHandoverDomain | null {
  const text = readString(value)?.toLowerCase();
  if (
    text === "commercial" ||
    text === "reservations" ||
    text === "guest_relations" ||
    text === "operations" ||
    text === "general"
  ) {
    return text;
  }
  return null;
}

function readSuggestedActions(...values: unknown[]): HaroldSuggestedAction[] {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const actions = value
      .map((entry) => {
        const obj = objectValue(entry);
        if (!obj) return null;
        const label = readString(obj.label, obj.title, obj.name);
        if (!label) return null;
        const type = readString(obj.type, obj.action, obj.kind) ?? "suggestion";
        return { type, label } satisfies HaroldSuggestedAction;
      })
      .filter((entry): entry is HaroldSuggestedAction => entry !== null);
    if (actions.length) return actions;
  }
  return [];
}

function readBoolean(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1) return true;
    if (value === "false" || value === 0) return false;
  }
  return false;
}

export function normalizeHaroldWebhookResponse(raw: unknown): HaroldWebhookResult {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === "string") {
    return {
      reply: first.trim() || null,
      handover: false,
      handoverReason: null,
      intent: null,
      confidence: null,
      languageQuality: null,
      entities: null,
      suggestedActions: [],
      handoverDomain: null,
    };
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
  const handover =
    readBoolean(handoverSignal) ||
    action === "handover" ||
    action === "escalate";

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
    intent: readString(root?.intent, data?.intent, result?.intent),
    confidence: readNumber(root?.confidence, data?.confidence, result?.confidence),
    languageQuality: readLanguageQuality(
      root?.languageQuality ??
        root?.language_quality ??
        data?.languageQuality ??
        data?.language_quality,
    ),
    entities:
      objectValue(root?.entities) ??
      objectValue(data?.entities) ??
      objectValue(result?.entities),
    suggestedActions: readSuggestedActions(
      root?.suggestedActions,
      root?.suggested_actions,
      data?.suggestedActions,
      data?.suggested_actions,
      result?.suggestedActions,
    ),
    handoverDomain: readHandoverDomain(
      root?.handoverDomain ??
        root?.handover_domain ??
        data?.handoverDomain ??
        data?.handover_domain,
    ),
  };
}
