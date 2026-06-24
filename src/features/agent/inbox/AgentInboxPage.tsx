"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { replyToThread, markThreadRead, archiveThread } from "./inbox-actions";
import type { InboxThread, InboxMessage } from "./inbox-service";

function stamp(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function DocAttachment({ msg }: { msg: InboxMessage }) {
  if (!msg.docUrl) return null;
  const isImage = msg.docMimeType?.startsWith("image/");
  return (
    <a
      href={msg.docUrl}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:text-white transition-colors w-fit"
    >
      <Icon
        name={isImage ? "image" : "file"}
        className="h-4 w-4 shrink-0 text-[var(--color-gold)]"
      />
      <span className="truncate max-w-[180px]">
        {msg.docName ?? "Attachment"}
      </span>
      <Icon name="arrow" className="h-3 w-3 shrink-0" />
    </a>
  );
}

export function AgentInboxPage({
  initialThreads,
}: {
  initialThreads: InboxThread[];
}) {
  const router = useRouter();
  const [threads, setThreads] = useState(initialThreads);
  const [selectedId, setSelectedId] = useState(initialThreads[0]?.id ?? null);
  const [pending, startTransition] = useTransition();
  const [replyBody, setReplyBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = threads.find((t) => t.id === selectedId) ?? null;
  const open = threads.filter((t) => t.status === "open");
  const archived = threads.filter((t) => t.status === "archived");

  function run(work: () => Promise<void | { error?: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await work();
        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  function handleSelect(thread: InboxThread) {
    setSelectedId(thread.id);
    if (thread.unreadCount > 0) {
      run(() => markThreadRead(thread.id));
    }
  }

  function handleReply() {
    if (!selected || !replyBody.trim()) return;
    const body = replyBody;
    setReplyBody("");
    run(() => replyToThread(selected.id, body));
  }

  function handleArchive() {
    if (!selected) return;
    run(() => archiveThread(selected.id));
  }

  return (
    <div className="shell-content flex flex-col gap-0 p-0 h-full">
      {/* Header */}
      <div className="shell-header px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Inbox</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Documents, confirmations and messages from your operator
          </p>
        </div>
        {open.length > 0 && (
          <span className="bg-[var(--color-gold)] text-black text-xs font-bold px-2 py-0.5 rounded-full">
            {open.reduce((s, t) => s + t.unreadCount, 0) || open.length}
          </span>
        )}
      </div>

      {error && (
        <p className="mx-6 mb-2 text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded">
          {error}
        </p>
      )}

      {/* Main pane */}
      <div className="flex flex-1 overflow-hidden border-t border-zinc-800">
        {/* Thread list */}
        <aside className="w-72 shrink-0 border-r border-zinc-800 bg-[#111110] overflow-y-auto flex flex-col">
          {threads.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 py-16 px-4 text-center">
              <Icon name="mail" className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Your inbox is empty.</p>
              <p className="text-xs mt-1">
                Your operator will send documents and messages here.
              </p>
            </div>
          )}

          {open.length > 0 && (
            <>
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 border-b border-zinc-800">
                Inbox
              </p>
              {open.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  selected={t.id === selectedId}
                  onClick={() => handleSelect(t)}
                />
              ))}
            </>
          )}

          {archived.length > 0 && (
            <>
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 border-b border-zinc-800 mt-2">
                Archived
              </p>
              {archived.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  selected={t.id === selectedId}
                  onClick={() => setSelectedId(t.id)}
                />
              ))}
            </>
          )}
        </aside>

        {/* Message pane */}
        <section className="flex-1 flex flex-col bg-[#1a1a18] overflow-hidden">
          {selected ? (
            <>
              {/* Thread header */}
              <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-white text-sm">
                    {selected.subject}
                  </h2>
                  {selected.contextType &&
                    selected.contextType !== "general" && (
                      <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 capitalize">
                        {selected.contextType}
                      </span>
                    )}
                </div>
                {selected.status === "open" && (
                  <button
                    onClick={handleArchive}
                    disabled={pending}
                    className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"
                  >
                    Archive
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selected.messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {selected.messages.length === 0 && (
                  <p className="text-center text-xs text-zinc-600 py-10">
                    No messages yet.
                  </p>
                )}
              </div>

              {/* Reply */}
              {selected.status === "open" && (
                <div className="border-t border-zinc-800 p-4 flex gap-2 items-end">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={2}
                    className="input flex-1 resize-none text-sm"
                    placeholder="Write a reply…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                        handleReply();
                    }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={pending || !replyBody.trim()}
                    className="bg-[var(--color-gold)] text-black p-3 rounded-xl disabled:opacity-40"
                    aria-label="Send reply"
                  >
                    <Icon name="send" className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-center px-6">
              <div>
                <Icon
                  name="mail"
                  className="w-10 h-10 mx-auto mb-3 text-zinc-700"
                />
                <p className="text-sm text-zinc-500 font-medium">
                  Select a message
                </p>
                <p className="text-xs text-zinc-600 mt-1">
                  Confidential — only you and your operator can see these
                  messages
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ThreadRow({
  thread,
  selected,
  onClick,
}: {
  thread: InboxThread;
  selected: boolean;
  onClick: () => void;
}) {
  const hasDoc = thread.messages.some((m) => m.docUrl);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-zinc-800 transition-colors ${
        selected ? "bg-[#2b2b29]" : "hover:bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-xs font-semibold truncate ${selected ? "text-[var(--color-gold)]" : "text-white"}`}
        >
          {thread.subject}
        </p>
        {thread.unreadCount > 0 && (
          <span className="shrink-0 w-2 h-2 rounded-full bg-[var(--color-gold)] mt-1" />
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        {hasDoc && (
          <Icon name="file" className="w-3 h-3 text-zinc-500 shrink-0" />
        )}
        <p className="text-[10px] text-zinc-500 truncate">
          {thread.messages.at(-1)?.body.slice(0, 60) ?? "No messages yet"}
        </p>
      </div>
      <p className="text-[9px] text-zinc-600 mt-1">
        {relativeTime(thread.lastMessageAt)}
      </p>
    </button>
  );
}

function MessageBubble({ msg }: { msg: InboxMessage }) {
  const isOutbound = msg.direction === "outbound";
  const isSystem = msg.isSystem;

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <p className="text-[10px] text-zinc-600 bg-zinc-900 px-3 py-1 rounded-full">
          {msg.body}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 ${
          isOutbound
            ? "bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20"
            : "bg-zinc-900 border border-zinc-800"
        }`}
      >
        <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
          {msg.body}
        </p>
        <DocAttachment msg={msg} />
        <p className="text-[9px] text-zinc-600 mt-2">{stamp(msg.createdAt)}</p>
      </div>
    </div>
  );
}
