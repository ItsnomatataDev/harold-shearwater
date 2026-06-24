"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import {
  requestAgentHumanHandover,
  sendAgentHaroldMessage,
} from "@/features/agent/harold/harold-actions";
import type {
  HaroldConversation,
  HaroldConversationStatus,
  HaroldMessage,
  HaroldMessageRole,
} from "@/features/team/harold/harold-service";

type MessageRow = Database["public"]["Tables"]["harold_messages"]["Row"];
type ConversationRow = Database["public"]["Tables"]["harold_conversations"]["Row"];

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

export function AgentHaroldChat({
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
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, pending]);

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`agent-harold-conversation:${selectedId}`)
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
                ? { ...conversation, messages: [...conversation.messages, message] }
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

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || pending) return;
    const message = input.trim();
    setInput("");
    setError(null);

    startTransition(async () => {
      try {
        const result = await sendAgentHaroldMessage(organizationId, {
          conversationId: selectedId ?? undefined,
          message,
        });

        result.messages.forEach((message) =>
          knownMessageIds.current.add(message.id),
        );

        setConversations((prev) => {
          const existing = prev.find((c) => c.id === result.conversationId);
          if (existing) {
            return prev.map((c) =>
              c.id === result.conversationId
                ? {
                    ...c,
                    status: result.status,
                    messages: [...c.messages, ...result.messages],
                  }
                : c,
            );
          }
          return [
            {
              id: result.conversationId,
              title: message.slice(0, 50),
              status: result.status,
              handoverReason: null,
              assignedToMembershipId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              messages: result.messages,
            },
            ...prev,
          ];
        });
        setSelectedId(result.conversationId);
        if (result.aiError) setError(result.aiError);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to send message.",
        );
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-hidden rounded-2xl border border-[#2e2e2b]">
      {/* Sidebar */}
      <div className="hidden w-64 shrink-0 flex-col border-r border-[#2e2e2b] bg-[#171715] lg:flex">
        <div className="border-b border-[#2e2e2b] px-4 py-3">
          <button
            onClick={() => setSelectedId(null)}
            className="w-full rounded-lg bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/20"
          >
            + New Conversation
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                  selectedId === c.id
                    ? "bg-[#2e2e2b] text-white"
                    : "text-[#777] hover:bg-[#1e1e1c] hover:text-white"
                }`}
              >
                <p className="truncate text-xs font-semibold">
                  {c.title || "Conversation"}
                </p>
                <p className="mt-0.5 text-[10px] text-[#555]">
                  {c.messages.length} message
                  {c.messages.length !== 1 ? "s" : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#1a1a18]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#2e2e2b] px-5 py-4">
          <Icon name="harold" className="h-5 w-5 text-[#c084fc]" />
          <div>
            <p className="text-sm font-semibold text-white">Harold</p>
            <p className="text-[10px] text-[#555]">
              Product info · Availability · Quotes · Policy
            </p>
          </div>
          {selected ? (
            <div className="ml-auto flex items-center gap-2">
              <span className="rounded-full border border-[#3a3a36] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#888]">
                {selected.status.replaceAll("_", " ")}
              </span>
              {selected.status === "ai_active" ? (
                <button
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        setError(null);
                        await requestAgentHumanHandover(organizationId, {
                          conversationId: selected.id,
                        });
                        setConversations((current) =>
                          current.map((conversation) =>
                            conversation.id === selected.id
                              ? {
                                  ...conversation,
                                  status: "handover_requested",
                                  handoverReason:
                                    "The agent requested help from the Shearwater team.",
                                }
                              : conversation,
                          ),
                        );
                      } catch (cause) {
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : "Unable to request assistance.",
                        );
                      }
                    })
                  }
                  className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-[10px] font-semibold text-gold"
                >
                  Ask a human
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!selected || selected.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Icon name="sparkles" className="h-8 w-8 text-[#444]" />
              <p className="text-sm font-semibold text-[#555]">
                Ask Harold anything about Shearwater products
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {[
                  "What activities are available at Victoria Falls?",
                  "What are the inclusions for the helicopter flight?",
                  "What is the cancellation policy?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-xl border border-[#2e2e2b] px-3 py-1.5 text-xs text-[#666] hover:text-white"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            selected.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    msg.role === "user"
                      ? "bg-gold/10 text-white"
                      : "bg-[#252522] text-[#d0d0c9]"
                  }`}
                >
                  {msg.role !== "user" && (
                    <p className="mb-1 text-[10px] font-semibold text-[#c084fc]">
                      {msg.authorName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-[#252522] px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-[#666]"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-2 rounded-lg bg-sunset/10 px-3 py-2 text-xs text-[#f18a77]">
            {error}
          </div>
        )}

        {/* Input */}
        <form onSubmit={send} className="border-t border-[#2e2e2b] px-4 py-4">
          {!webhookConfigured && !selected && (
            <p className="mb-2 text-center text-[10px] text-[#555]">
              Harold is not configured yet.
            </p>
          )}
          <div className="flex items-center gap-3">
            <input
              className="input flex-1"
              placeholder="Ask about products, availability, rates, policy…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={pending || selected?.status === "resolved" || (!selected && !webhookConfigured)}
            />
            <button
              type="submit"
              disabled={pending || !input.trim() || selected?.status === "resolved" || (!selected && !webhookConfigured)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-black disabled:opacity-40"
            >
              <Icon name="send" className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
