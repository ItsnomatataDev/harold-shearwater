"use client";

import Link from "next/link";
import { useState, useTransition, useRef, useEffect } from "react";
import { Icon } from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import {
  requestCustomerHumanHandover,
  sendCustomerHaroldMessage,
} from "@/features/customer/harold/customer-harold-actions";
import type {
  HaroldConversation,
  HaroldConversationStatus,
  HaroldMessage,
  HaroldMessageRole,
} from "@/features/team/harold/harold-service";
import { HaroldHandoverBanner } from "@/features/team/harold/components/HaroldHandoverBanner";

type MessageRow = Database["public"]["Tables"]["harold_messages"]["Row"];
type ConversationRow =
  Database["public"]["Tables"]["harold_conversations"]["Row"];

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

export function CustomerHaroldChat({
  initialConversations,
  initialSelectedId = null,
  webhookConfigured,
}: {
  initialConversations: HaroldConversation[];
  initialSelectedId?: string | null;
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
    initialSelectedId &&
      initialConversations.some((conversation) => conversation.id === initialSelectedId)
      ? initialSelectedId
      : initialConversations[0]?.id ?? null,
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
      .channel(`customer-harold:${selectedId}`)
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
                    chatConversationId: row.chat_conversation_id,
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
    if (!input.trim() || pending || selected?.status !== "ai_active") return;
    const message = input.trim();
    setInput("");
    setError(null);

    startTransition(async () => {
      try {
        const result = await sendCustomerHaroldMessage({
          conversationId: selectedId ?? undefined,
          message,
        });

        result.messages.forEach((item) => knownMessageIds.current.add(item.id));

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
              chatConversationId: null,
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

  const messagesHref = selected?.chatConversationId
    ? `/customer/messages?conversation=${selected.chatConversationId}`
    : "/customer/messages";

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-hidden rounded-2xl border border-[#343431] bg-[#1d1d1b]">
      <div className="hidden w-64 shrink-0 flex-col border-r border-[#343431] bg-[#181816] lg:flex">
        <div className="border-b border-[#343431] px-4 py-3">
          <button
            onClick={() => setSelectedId(null)}
            className="w-full rounded-lg bg-savannah/10 px-3 py-2 text-xs font-semibold text-savannah hover:bg-savannah/20"
          >
            + New conversation
          </button>
        </div>
        <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition ${
                  selectedId === c.id
                    ? "bg-[#2b2b29] text-white shadow-[inset_3px_0_0_var(--color-savannah)]"
                    : "text-[#777] hover:bg-[#212120] hover:text-white"
                }`}
              >
                <p className="truncate text-xs font-semibold">
                  {c.title || "Conversation"}
                </p>
                <p className="mt-0.5 text-[10px] text-[#555]">
                  {c.status.replaceAll("_", " ")}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-[#343431] px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-victoria/10 text-victoria">
              <Icon name="harold" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">Harold AI</p>
              <p className="text-[10px] text-[#777]">
                Powered by the secure n8n workflow
              </p>
            </div>
            {selected ? (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-victoria/30 bg-victoria/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-victoria">
                  {selected.status.replaceAll("_", " ")}
                </span>
                {selected.status === "ai_active" ? (
                  <button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        try {
                          setError(null);
                          await requestCustomerHumanHandover({
                            conversationId: selected.id,
                          });
                          setConversations((current) =>
                            current.map((conversation) =>
                              conversation.id === selected.id
                                ? {
                                    ...conversation,
                                    status: "handover_requested",
                                    handoverReason:
                                      "The guest requested help from the Shearwater team.",
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
                    Talk to a person
                  </button>
                ) : null}
                {selected.status === "human_active" ? (
                  <Link
                    href={messagesHref}
                    className="rounded-lg bg-savannah px-3 py-1.5 text-[10px] font-semibold text-black"
                  >
                    Continue in Messages
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8e8e87]">
            You are speaking with Harold AI. When human help is needed, Harold
            hands the conversation to a Shearwater team member and you continue
            in Messages — not in this AI thread.
          </p>
        </div>

        {selected ? (
          <HaroldHandoverBanner
            status={selected.status}
            sourceAccess="customer"
            handoverReason={selected.handoverReason}
          />
        ) : null}

        {selected?.status === "human_active" && (
          <div className="border-b border-savannah/10 bg-savannah/5 px-5 py-2 text-center text-[11px] text-savannah">
            <Link href={messagesHref} className="font-semibold underline">
              Open Messages
            </Link>{" "}
            to chat with your specialist.
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!selected || selected.messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Icon name="sparkles" className="h-8 w-8 text-victoria/60" />
              <p className="text-sm font-semibold text-[#9b9b94]">
                Ask Harold about your trip
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {[
                  "What experiences are best for families?",
                  "What should I bring for a sunset cruise?",
                  "How do I prepare for my booking?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="rounded-xl border border-[#343431] px-3 py-1.5 text-xs text-[#777] hover:text-white"
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
                      ? "bg-savannah/15 text-white"
                      : msg.role === "assistant"
                        ? "border border-victoria/20 bg-victoria/5 text-[#d0d0c9]"
                        : "bg-[#252522] text-[#d0d0c9]"
                  }`}
                >
                  {msg.role !== "user" && (
                    <p
                      className={`mb-1 text-[10px] font-semibold ${
                        msg.role === "assistant" ? "text-victoria" : "text-gold"
                      }`}
                    >
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
              <div className="rounded-2xl border border-victoria/20 bg-victoria/5 px-4 py-3">
                <div className="flex gap-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-victoria/70"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={scrollEndRef} />
        </div>

        {error && (
          <div className="mx-5 mb-2 rounded-lg bg-sunset/10 px-3 py-2 text-xs text-sunset">
            {error}
          </div>
        )}

        <form onSubmit={send} className="border-t border-[#343431] px-4 py-4">
          {!webhookConfigured && !selected && (
            <p className="mb-2 text-center text-[10px] text-[#777]">
              Harold is not configured yet. Set N8N_HAROLD_WEBHOOK in your
              environment.
            </p>
          )}
          <div className="flex items-center gap-3">
            <input
              className="input flex-1"
              placeholder={
                selected?.status === "ai_active"
                  ? "Ask Harold about products, preparation or your trip…"
                  : "Continue this conversation in Messages"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={
                pending ||
                selected?.status !== "ai_active" ||
                (!selected && !webhookConfigured)
              }
            />
            <button
              type="submit"
              disabled={
                pending ||
                !input.trim() ||
                selected?.status !== "ai_active" ||
                (!selected && !webhookConfigured)
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-savannah text-black disabled:opacity-40"
            >
              <Icon name="send" className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
