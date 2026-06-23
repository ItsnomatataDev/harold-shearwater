"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type {
  HaroldConversation,
  HaroldConversationStatus,
  HaroldMessage,
  HaroldMessageRole,
} from "../harold-service";
import { requestHumanHandover, sendHaroldMessage } from "../harold-actions";

type MessageRow = Database["public"]["Tables"]["harold_messages"]["Row"];
type ConversationRow =
  Database["public"]["Tables"]["harold_conversations"]["Row"];

const statusDetails: Record<
  HaroldConversationStatus,
  { label: string; tone: string; dot: string }
> = {
  ai_active: {
    label: "Harold AI",
    tone: "border-victoria/30 bg-victoria/10 text-victoria",
    dot: "bg-victoria",
  },
  handover_requested: {
    label: "Waiting for Team Access",
    tone: "border-gold/30 bg-gold/10 text-gold",
    dot: "bg-gold",
  },
  human_active: {
    label: "Human support active",
    tone: "border-savannah/30 bg-savannah/10 text-savannah",
    dot: "bg-savannah",
  },
  resolved: {
    label: "Resolved",
    tone: "border-[#444] bg-[#292927] text-[#999]",
    dot: "bg-[#777]",
  },
};

function realtimeMessage(row: MessageRow): HaroldMessage {
  const role = row.role as HaroldMessageRole;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role,
    content: row.content,
    authorName:
      role === "assistant"
        ? "Harold"
        : role === "human"
          ? "Shearwater Team"
          : role === "system"
            ? "System"
            : "You",
    createdAt: row.created_at,
  };
}

export function HaroldChat({
  organizationId,
  initialConversations,
  webhookConfigured,
}: {
  organizationId: string;
  initialConversations: HaroldConversation[];
  webhookConfigured: boolean;
}) {
  const knownMessageIds = useRef(
    new Set(
      initialConversations.flatMap((conversation) =>
        conversation.messages.map((message) => message.id),
      ),
    ),
  );
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(
    initialConversations[0]?.id ?? "",
  );
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const selected = conversations.find(
    (conversation) => conversation.id === selectedId,
  );

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, pending]);

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`harold-conversation:${selectedId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "harold_messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const message = realtimeMessage(payload.new as MessageRow);
          if (knownMessageIds.current.has(message.id)) return;
          knownMessageIds.current.add(message.id);
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === selectedId
                ? {
                    ...conversation,
                    messages: [...conversation.messages, message],
                  }
                : conversation,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "harold_conversations",
          filter: `id=eq.${selectedId}`,
        },
        (payload) => {
          const row = payload.new as ConversationRow;
          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === row.id
                ? {
                    ...conversation,
                    status: row.status as HaroldConversationStatus,
                    handoverReason: row.handover_reason,
                    assignedToMembershipId: row.assigned_to_membership_id,
                    updatedAt: row.updated_at,
                  }
                : conversation,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedId]);

  function addMessages(
    conversationId: string,
    title: string,
    messages: HaroldMessage[],
    status: HaroldConversationStatus,
  ) {
    const unseen = messages.filter((message) => {
      if (knownMessageIds.current.has(message.id)) return false;
      knownMessageIds.current.add(message.id);
      return true;
    });
    setConversations((current) => {
      const existing = current.find(
        (conversation) => conversation.id === conversationId,
      );
      if (existing) {
        return current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                status,
                updatedAt: messages.at(-1)?.createdAt ?? conversation.updatedAt,
                messages: [...conversation.messages, ...unseen],
              }
            : conversation,
        );
      }
      const createdAt = messages[0]?.createdAt ?? new Date().toISOString();
      return [
        {
          id: conversationId,
          title,
          status,
          handoverReason: null,
          assignedToMembershipId: null,
          createdAt,
          updatedAt: messages.at(-1)?.createdAt ?? createdAt,
          messages: unseen,
        },
        ...current,
      ];
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await sendHaroldMessage(organizationId, {
          conversationId: selectedId || undefined,
          message: content,
        });
        setSelectedId(result.conversationId);
        addMessages(
          result.conversationId,
          content.slice(0, 60),
          result.messages as HaroldMessage[],
          result.status as HaroldConversationStatus,
        );
        if (result.aiError) setError(result.aiError);
      } catch (cause) {
        setInput(content);
        setError(
          cause instanceof Error ? cause.message : "Unable to send message.",
        );
      }
    });
  }

  function requestHandover() {
    if (!selected) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await requestHumanHandover(organizationId, {
          conversationId: selected.id,
          reason: "The user requested a human conversation.",
        });
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selected.id
              ? {
                  ...conversation,
                  status: "handover_requested",
                  handoverReason: "The user requested a human conversation.",
                }
              : conversation,
          ),
        );
        setNotice("Human assistance requested. Team Access has been notified.");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to request a handover.",
        );
      }
    });
  }

  const status = selected?.status ?? "ai_active";
  const currentStatus = statusDetails[status];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#343431] bg-[#1d1d1b] lg:grid lg:min-h-155 lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-[#343431] bg-[#181816] p-4 lg:border-b-0 lg:border-r">
        <button
          onClick={() => {
            setSelectedId("");
            setError(null);
            setNotice(null);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#3b3b38] px-3 py-2.5 text-xs font-semibold text-[#d2d2cb]"
        >
          <Icon name="plus" className="h-4 w-4" />
          New conversation
        </button>
        <div className="mt-4 space-y-1">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => {
                setSelectedId(conversation.id);
                setError(null);
                setNotice(null);
              }}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                selectedId === conversation.id
                  ? "bg-[#30302d] text-white"
                  : "text-[#888882] hover:bg-[#242422]"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusDetails[conversation.status].dot}`}
                />
                <span className="truncate text-xs">{conversation.title}</span>
              </span>
              <span className="mt-1 block pl-3.5 text-[9px] text-[#666]">
                {statusDetails[conversation.status].label}
              </span>
            </button>
          ))}
          {!conversations.length && (
            <p className="px-3 py-6 text-center text-[10px] text-[#666]">
              No conversations yet.
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-h-125 flex-col">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#343431] px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">
              {selected?.title ?? "New conversation"}
            </p>
            <p className="mt-1 text-[10px] text-[#74746e]">
              AI assistance with a controlled Team Access handover.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${currentStatus.tone}`}
            >
              {currentStatus.label}
            </span>
            {selected?.status === "ai_active" && (
              <button
                disabled={pending}
                onClick={requestHandover}
                className="rounded-lg border border-[#444] px-3 py-1.5 text-[9px] font-semibold text-[#bbb] hover:border-savannah/50 hover:text-savannah disabled:opacity-50"
              >
                Talk to a person
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {selected?.messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-sunset text-white"
                    : message.role === "human"
                      ? "border border-savannah/20 bg-savannah/8 text-[#d9f2e5]"
                      : message.role === "system"
                        ? "border border-gold/20 bg-gold/8 text-[#d9c58d]"
                        : "bg-[#292927] text-[#ddd]"
                }`}
              >
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[.08em] opacity-60">
                  {message.authorName}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {(!selected || !selected.messages.length) && (
            <div className="grid min-h-72 place-items-center text-center">
              <div>
                <Icon
                  name="sparkles"
                  className="mx-auto h-7 w-7 text-victoria"
                />
                <p className="mt-4 text-sm font-semibold text-white">
                  Ask Harold
                </p>
                <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#777771]">
                  Harold sends your message securely to the configured n8n
                  workflow. You can request a Team Access handover whenever
                  human help is needed.
                </p>
              </div>
            </div>
          )}

          {pending && status === "ai_active" && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-[#292927] px-4 py-3">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[.08em] opacity-60">
                  Harold
                </p>
                <div className="flex items-center gap-1.5 py-1.5">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#666]"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#666]"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#666]"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          {!webhookConfigured && status === "ai_active" && (
            <p className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-xs text-gold">
              The n8n webhook is not configured. Messages will still be saved.
            </p>
          )}
          {notice && (
            <p className="rounded-xl border border-savannah/20 bg-savannah/5 px-4 py-3 text-xs text-savannah">
              {notice}
            </p>
          )}
          {error && (
            <div className="rounded-xl border border-sunset/20 bg-sunset/5 px-4 py-3">
              <p className="text-xs text-[#f18a77]">{error}</p>
              {selected?.status === "ai_active" && (
                <button
                  disabled={pending}
                  onClick={requestHandover}
                  className="mt-2 text-[10px] font-semibold text-savannah"
                >
                  Request human assistance
                </button>
              )}
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>

        <form
          onSubmit={submit}
          className="flex gap-2 border-t border-[#343431] p-4"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={selected?.status === "resolved"}
            placeholder={
              selected?.status === "resolved"
                ? "This conversation is resolved"
                : selected?.status === "human_active" ||
                    selected?.status === "handover_requested"
                  ? "Message the Shearwater team…"
                  : "Ask Harold…"
            }
            className="input flex-1"
          />
          <button
            disabled={
              pending || !input.trim() || selected?.status === "resolved"
            }
            className="rounded-xl bg-victoria px-4 text-white disabled:opacity-50"
          >
            <Icon name="send" className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
