"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/Icon";
import { sendHaroldMessage } from "../harold-actions";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export function HaroldChat({
  organizationId,
  initialConversationId,
}: {
  organizationId: string;
  initialConversationId?: string;
}) {
  const [conversationId, setConversationId] = useState(
    initialConversationId || "",
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const result = await sendHaroldMessage(organizationId, {
        conversationId: conversationId || undefined,
        message: userMessage,
      });

      if (!conversationId) {
        setConversationId(result.conversationId || "");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.assistantResponse },
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to send message",
      );
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-[#343431] bg-[#1d1d1b]">
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 rounded-full bg-victoria/10 p-3">
              <Icon name="sparkles" className="h-6 w-6 text-victoria" />
            </div>
            <p className="font-semibold text-white">Welcome to Harold</p>
            <p className="mt-1 text-sm text-[#8a8a84]">
              Your AI assistant for task management and team operations
            </p>
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold text-[#b7b7b0]">Try:</p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMessages([
                      {
                        role: "user",
                        content: "Create a task: Review booking system changes",
                      },
                    ]);
                    setInput("");
                  }}
                  className="rounded-lg border border-[#3a3a36] bg-[#232321] px-3 py-2 text-xs text-[#d6d6cf] transition hover:bg-[#30302e]"
                >
                  Create a task: Review booking system changes
                </button>
                <button
                  onClick={() => {
                    setMessages([{ role: "user", content: "Hello" }]);
                    setInput("");
                  }}
                  className="rounded-lg border border-[#3a3a36] bg-[#232321] px-3 py-2 text-xs text-[#d6d6cf] transition hover:bg-[#30302e]"
                >
                  Hello
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-sunset text-white"
                  : "border border-[#343431] bg-[#232321] text-[#d6d6cf]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl border border-[#343431] bg-[#232321] px-4 py-3">
              <div className="flex gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-victoria"></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-victoria"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-victoria"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#343431] p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Harold…"
            disabled={loading}
            className="flex-1 rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white placeholder:text-[#62625d] focus:border-victoria focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-victoria px-4 py-3 text-white transition hover:bg-[#6366f1] disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
