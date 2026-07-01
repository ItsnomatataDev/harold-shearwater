"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { askHaroldAssistant } from "./harold-assistant-actions";
import { getHaroldModule } from "./harold-modules";
import { useHaroldAssistant } from "./HaroldAssistantProvider";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string | null;
  confidence?: number | null;
  suggestedActions?: Array<{ type: string; label: string }>;
  handover?: boolean;
};

export function HaroldLauncher() {
  const { access, module } = useHaroldAssistant();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [handoverHref, setHandoverHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const moduleDef = getHaroldModule(module?.moduleId);
  const moduleLabel = moduleDef?.label ?? "this screen";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, pending]);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setError(null);
    setHandoverHref(null);
    setInput("");

    const userTurn: Turn = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const history = turns.slice(-8).map((turn) => ({
      role: turn.role,
      content: turn.content,
    }));
    setTurns((current) => [...current, userTurn]);

    startTransition(async () => {
      const result = await askHaroldAssistant({
        access,
        moduleId: module?.moduleId ?? "basecamp",
        message: trimmed,
        recordType: module?.recordType,
        recordId: module?.recordId,
        summary: module?.summary,
        data: module?.data,
        history,
      });

      if (result.error && !result.reply) {
        setError(result.error);
        return;
      }

      setTurns((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.reply ?? "",
          intent: result.intent,
          confidence: result.confidence,
          suggestedActions: result.suggestedActions,
          handover: result.handoverRequested,
        },
      ]);

      if (result.handoverRequested && result.continueHref) {
        setHandoverHref(result.continueHref);
      }
    });
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Harold assistant"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-savannah px-4 py-3 text-sm font-semibold text-black shadow-[0_12px_40px_rgba(0,0,0,.45)] transition hover:opacity-90"
        >
          <Icon name="harold" className="h-4 w-4" />
          Ask Harold
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label="Close Harold"
            className="flex-1 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="flex h-full w-full max-w-md flex-col border-l border-[#2d2d2a] bg-[#151514]">
            <header className="flex items-center gap-3 border-b border-[#2d2d2a] px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-victoria/10 text-victoria">
                <Icon name="harold" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Harold</p>
                <p className="truncate text-[10px] text-[#8b8b84]">
                  Helping with {moduleLabel}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto p-1 text-[#999] hover:text-white"
                aria-label="Close"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {turns.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm leading-6 text-[#9b9b94]">
                    Ask Harold about {moduleLabel}. Harold understands what you
                    are looking at and will hand over to a person when needed.
                  </p>
                  {moduleDef?.prompts?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {moduleDef.prompts.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => ask(prompt)}
                          className="rounded-xl border border-[#343431] px-3 py-1.5 text-xs text-[#9b9b94] transition hover:border-savannah/40 hover:text-white"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                turns.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        turn.role === "user"
                          ? "bg-savannah/15 text-white"
                          : "border border-victoria/20 bg-victoria/5 text-[#d0d0c9]"
                      }`}
                    >
                      {turn.role === "assistant" && (
                        <p className="mb-1 text-[10px] font-semibold text-victoria">
                          Harold
                          {turn.intent ? ` · ${turn.intent}` : ""}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{turn.content}</p>
                      {turn.handover && (
                        <div className="mt-2 space-y-2">
                          <p className="rounded-lg bg-gold/10 px-2 py-1 text-[10px] text-gold">
                            A Shearwater team member has been notified and can
                            pick this up from the handover inbox.
                          </p>
                        </div>
                      )}
                      {turn.suggestedActions?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {turn.suggestedActions.map((action) => (
                            <span
                              key={action.label}
                              className="rounded-md border border-[#343431] px-2 py-0.5 text-[10px] text-[#9b9b94]"
                            >
                              {action.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
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
              <div ref={scrollRef} />
            </div>

            {handoverHref && (
              <div className="mx-5 mb-2 rounded-lg border border-gold/20 bg-gold/10 px-3 py-2 text-xs text-gold">
                <p>Your conversation is with the team now.</p>
                <Link
                  href={handoverHref}
                  className="mt-1 inline-flex items-center gap-1 font-semibold text-white hover:text-gold"
                >
                  Open Harold AI chat
                  <Icon name="arrow" className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {error && (
              <div className="mx-5 mb-2 rounded-lg bg-sunset/10 px-3 py-2 text-xs text-sunset">
                {error}
              </div>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                ask(input);
              }}
              className="border-t border-[#2d2d2a] px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <input
                  className="input flex-1"
                  placeholder={`Ask about ${moduleLabel}…`}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={pending}
                />
                <button
                  type="submit"
                  disabled={pending || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-savannah text-black disabled:opacity-40"
                >
                  <Icon name="send" className="h-4 w-4" />
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </>
  );
}
