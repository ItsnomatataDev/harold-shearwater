"use client";

import { Icon } from "@/components/Icon";
import type { HaroldConversationStatus } from "../harold-service";

export function HaroldHandoverBanner({
  status,
  sourceAccess,
  handoverReason,
  assignedToName,
}: {
  status: HaroldConversationStatus;
  sourceAccess?: "team" | "agent" | "customer";
  handoverReason?: string | null;
  assignedToName?: string | null;
}) {
  if (status === "ai_active") return null;

  if (status === "handover_requested") {
    return (
      <div className="border-b border-gold/20 bg-gold/8 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold/15">
            <Icon name="users" className="h-4 w-4 text-gold" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gold">
              Handover in progress
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#b8a56a]">
              {sourceAccess === "agent" || sourceAccess === "customer"
                ? "Harold has notified the Shearwater team. Any available team member can pick this up and continue with you shortly."
                : "Harold has notified the team. Someone qualified will join this conversation shortly."}
            </p>
            {handoverReason ? (
              <p className="mt-2 text-[10px] text-[#8f7f55]">
                Reason: {handoverReason}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (status === "human_active") {
    return (
      <div className="border-b border-savannah/20 bg-savannah/8 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-savannah/15">
            <Icon name="communication" className="h-4 w-4 text-savannah" />
          </div>
          <div>
            <p className="text-xs font-semibold text-savannah">
              {assignedToName
                ? `${assignedToName} is helping you`
                : "A Shearwater specialist is helping you"}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#7fb89a]">
              Continue in Messages for live replies. Your specialist has the
              full Harold conversation context.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "resolved") {
    return (
      <div className="border-b border-[#343431] bg-[#181816] px-4 py-3 text-[11px] text-[#777]">
        This conversation has been resolved. Start a new chat if you need more
        help.
      </div>
    );
  }

  return null;
}
