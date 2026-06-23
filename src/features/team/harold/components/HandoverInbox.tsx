"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import type { HandoverConversation } from "../handover-service";
import { claimHandover, resolveHandover, sendHumanReply } from "../handover-actions";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Harare",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export function HandoverInbox({
  organizationId,
  currentMembershipId,
  conversations,
}: {
  organizationId: string;
  currentMembershipId: string;
  conversations: HandoverConversation[];
}) {
  const router = useRouter();
  const [view, setView] = useState<"active" | "resolved">("active");
  const visible = conversations.filter((conversation) =>
    view === "resolved"
      ? conversation.status === "resolved"
      : conversation.status !== "resolved",
  );
  const [selectedId, setSelectedId] = useState(visible[0]?.id ?? "");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected =
    conversations.find((conversation) => conversation.id === selectedId) ??
    visible[0] ??
    null;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`harold-handover-queue:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "harold_conversations",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "harold_messages" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, router]);

  function run(action: () => Promise<void>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        onSuccess?.();
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to update handover.");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[#343431] bg-[#1d1d1b] lg:grid lg:min-h-160 lg:grid-cols-[340px_1fr]">
      <aside className="border-b border-[#343431] bg-[#181816] lg:border-b-0 lg:border-r">
        <div className="border-b border-[#343431] p-4">
          <div className="flex rounded-xl bg-[#111] p-1">
            {(["active", "resolved"] as const).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setView(item);
                  const next = conversations.find((conversation) =>
                    item === "resolved"
                      ? conversation.status === "resolved"
                      : conversation.status !== "resolved",
                  );
                  setSelectedId(next?.id ?? "");
                }}
                className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-semibold capitalize ${
                  view === item ? "bg-[#343431] text-white" : "text-[#777]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-130 overflow-y-auto p-3">
          {visible.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedId(conversation.id)}
              className={`mb-1 w-full rounded-xl p-3 text-left transition ${
                selected?.id === conversation.id
                  ? "bg-[#30302d]"
                  : "hover:bg-[#242422]"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <strong className="truncate text-xs text-[#ddd]">
                  {conversation.requesterName}
                </strong>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    conversation.status === "handover_requested"
                      ? "bg-gold"
                      : conversation.status === "human_active"
                        ? "bg-savannah"
                        : "bg-[#666]"
                  }`}
                />
              </span>
              <span className="mt-1 block truncate text-[10px] text-[#888]">
                {conversation.title}
              </span>
              <span className="mt-2 block text-[9px] text-[#60605b]">
                {formatTime(conversation.updatedAt)} · {conversation.sourceAccess}
              </span>
            </button>
          ))}
          {!visible.length && (
            <div className="px-5 py-14 text-center">
              <Icon name="communication" className="mx-auto h-6 w-6 text-[#555]" />
              <p className="mt-3 text-xs font-semibold text-[#aaa]">
                No {view} handovers
              </p>
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-125 flex-col">
        {selected ? (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#343431] p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-victoria">
                  {selected.sourceAccess} access · {selected.requesterEmail}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  {selected.requesterName}
                </h2>
                <p className="mt-1 text-xs text-[#777]">{selected.title}</p>
                {selected.handoverReason && (
                  <p className="mt-2 text-[10px] text-gold">
                    Reason: {selected.handoverReason}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selected.status === "handover_requested" && (
                  <button
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        claimHandover(organizationId, {
                          conversationId: selected.id,
                        }),
                      )
                    }
                    className="rounded-xl bg-savannah px-4 py-2.5 text-xs font-semibold text-[#102018] disabled:opacity-50"
                  >
                    Take over conversation
                  </button>
                )}
                {selected.status === "human_active" &&
                  selected.assignedToMembershipId === currentMembershipId && (
                    <button
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          resolveHandover(organizationId, {
                            conversationId: selected.id,
                          }),
                        )
                      }
                      className="rounded-xl border border-[#444] px-4 py-2.5 text-xs font-semibold text-[#bbb] disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  )}
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {selected.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "human" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-4 py-3 ${
                      message.role === "human"
                        ? "bg-savannah text-[#102018]"
                        : message.role === "user"
                          ? "bg-[#292927] text-[#ddd]"
                          : message.role === "system"
                            ? "border border-gold/20 bg-gold/8 text-[#d9c58d]"
                            : "border border-victoria/20 bg-victoria/8 text-[#cdeaf5]"
                    }`}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-[.08em] opacity-60">
                      {message.authorName}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                    <p className="mt-2 text-[9px] opacity-50">
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {error && (
                <p className="rounded-xl border border-sunset/20 bg-sunset/5 px-4 py-3 text-xs text-[#f18a77]">
                  {error}
                </p>
              )}
            </div>

            {selected.status === "human_active" &&
              selected.assignedToMembershipId === currentMembershipId && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const message = reply.trim();
                    if (!message) return;
                    run(
                      () =>
                        sendHumanReply(organizationId, {
                          conversationId: selected.id,
                          message,
                        }),
                      () => setReply(""),
                    );
                  }}
                  className="flex gap-2 border-t border-[#343431] p-4"
                >
                  <input
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder={`Reply to ${selected.requesterName}…`}
                    className="input flex-1"
                  />
                  <button
                    disabled={pending || !reply.trim()}
                    className="rounded-xl bg-savannah px-4 text-[#102018] disabled:opacity-50"
                  >
                    <Icon name="send" className="h-4 w-4" />
                  </button>
                </form>
              )}

            {selected.status === "human_active" &&
              selected.assignedToMembershipId !== currentMembershipId && (
                <div className="border-t border-[#343431] px-5 py-4 text-xs text-[#777]">
                  Assigned to {selected.assignedToName ?? "another Team Access member"}.
                </div>
              )}
          </>
        ) : (
          <div className="grid flex-1 place-items-center px-6 py-20 text-center">
            <div>
              <Icon name="users" className="mx-auto h-8 w-8 text-[#555]" />
              <h2 className="mt-4 text-sm font-semibold text-[#bbb]">
                Handover queue is clear
              </h2>
              <p className="mt-2 text-xs text-[#6f6f69]">
                Conversations escalated by Harold will appear here in realtime.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
