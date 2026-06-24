"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/Icon";
import { markChatRead, sendChatMessage, startDirectConversation } from "./chat-actions";
import type { ChatConversation } from "./chat-service";
import type { DocumentRecipient } from "@/features/documents/document-inbox-service";

type ChatFilter = "all" | "unread" | "agent" | "customer" | "team";
const filters: Array<{ key: ChatFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "agent", label: "Agents" },
  { key: "customer", label: "Customers" },
  { key: "team", label: "Team" },
];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function time(value: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ChatPage({ initialConversations, initialSelectedId, currentUserId, accessType, recipients }: { initialConversations: ChatConversation[]; initialSelectedId?: string; currentUserId: string; accessType: "team" | "agent" | "customer"; recipients?: DocumentRecipient[] }) {
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? initialConversations[0]?.id ?? null);
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [contactsOpen, setContactsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = conversations.find((conversation) => conversation.id === selectedId);
  const visible = useMemo(() => conversations.filter((conversation) => {
    if (filter === "unread" && !conversation.unreadCount) return false;
    if (filter !== "all" && filter !== "unread" && conversation.category !== filter) return false;
    return conversation.title.toLowerCase().includes(search.toLowerCase());
  }), [conversations, filter, search]);

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    const channel = supabase.channel(`chat:${selectedId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${selectedId}` }, (payload) => {
      const row = payload.new as { id: string; conversation_id: string; sender_user_id: string; sender_access: "team" | "agent" | "customer"; body: string; created_at: string };
      setConversations((current) => current.map((conversation) => conversation.id === selectedId && !conversation.messages.some((message) => message.id === row.id) ? { ...conversation, updatedAt: row.created_at, unreadCount: row.sender_user_id === currentUserId ? conversation.unreadCount : conversation.unreadCount + 1, messages: [...conversation.messages, { id: row.id, conversationId: row.conversation_id, senderUserId: row.sender_user_id, senderAccess: row.sender_access, senderName: conversation.participants.find((participant) => participant.userId === row.sender_user_id)?.name ?? "User", body: row.body, createdAt: row.created_at }] } : conversation));
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentUserId, selectedId]);

  function selectConversation(conversation: ChatConversation) {
    setSelectedId(conversation.id);
    if (conversation.unreadCount) {
      setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item));
      startTransition(() => markChatRead(conversation.id, accessType));
    }
  }

  function send() {
    if (!selected || !body.trim()) return;
    const text = body; setBody(""); setError(null);
    startTransition(async () => { try { await sendChatMessage(selected.id, accessType, text); } catch (cause) { setBody(text); setError(cause instanceof Error ? cause.message : "Message not sent."); } });
  }

  function startChat(membershipId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const conversationId = await startDirectConversation(membershipId);
        setContactsOpen(false);
        setSelectedId(conversationId);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Conversation could not be started.");
      }
    });
  }

  return <section className="overflow-hidden rounded-2xl border border-[#343431] bg-[#171716]">
    <div className="grid min-h-[calc(100vh-150px)] md:grid-cols-[350px_1fr]">
      <aside className="flex min-h-0 flex-col border-r border-[#343431]">
        <div className="border-b border-[#343431] p-4">
          <div className="flex items-center justify-between"><h1 className="text-xl font-semibold text-white">Chats</h1>{recipients && <button aria-label="New chat" onClick={() => setContactsOpen(true)} className="grid h-9 w-9 place-items-center rounded-full bg-savannah text-[#102018]"><Icon name="plus" className="h-4 w-4" /></button>}</div>
          <div className="relative mt-4"><Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-[#666]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chats" className="input w-full pl-9" /></div>
          <div className="mt-3 flex gap-1 overflow-x-auto">{filters.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold ${filter === item.key ? "bg-savannah text-[#102018]" : "bg-[#292927] text-[#888] hover:text-white"}`}>{item.label}</button>)}</div>
        </div>
        <div className="flex-1 overflow-y-auto">{visible.map((conversation) => { const last = conversation.messages.at(-1); return <button key={conversation.id} onClick={() => selectConversation(conversation)} className={`flex w-full gap-3 border-b border-[#292927] p-4 text-left ${selectedId === conversation.id ? "bg-[#292927]" : "hover:bg-white/3"}`}><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-victoria/15 text-xs font-bold text-victoria">{initials(conversation.title)}</span><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-sm text-white">{conversation.title}</strong><small className="text-[9px] text-[#666]">{last ? time(last.createdAt) : ""}</small></span><span className="mt-1 flex items-center gap-2"><span className="truncate text-[11px] text-[#777]">{last?.body ?? "Start the conversation"}</span>{conversation.unreadCount > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-savannah px-1 text-[9px] font-bold text-[#102018]">{conversation.unreadCount}</span>}</span></span></button>; })}{!visible.length && <p className="p-8 text-center text-xs text-[#666]">No chats in this view.</p>}</div>
      </aside>
      <main className="flex min-w-0 flex-col bg-[#111110]">{selected ? <><header className="flex items-center gap-3 border-b border-[#343431] px-5 py-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-victoria/15 text-xs font-bold text-victoria">{initials(selected.title)}</span><div><h2 className="font-semibold text-white">{selected.title}</h2><p className="text-[10px] capitalize text-[#777]">{selected.category} access</p></div></header><div className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_center,#1b1b19_0,#111110_70%)] p-5">{selected.messages.map((message) => <div key={message.id} className={`flex ${message.senderUserId === currentUserId ? "justify-end" : "justify-start"}`}><div className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${message.senderUserId === currentUserId ? "rounded-br-sm bg-savannah/20" : "rounded-bl-sm bg-[#292927]"}`}><p className="whitespace-pre-wrap text-sm text-[#e1e1da]">{message.body}</p><p className="mt-1 text-right text-[8px] text-[#777]">{time(message.createdAt)}</p></div></div>)}</div>{error && <p className="border-t border-sunset/20 bg-sunset/5 px-4 py-2 text-xs text-sunset">{error}</p>}<footer className="flex items-end gap-2 border-t border-[#343431] p-3"><textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={1} placeholder="Type a message" className="input max-h-32 flex-1 resize-none rounded-2xl" /><button onClick={send} disabled={pending || !body.trim()} className="grid h-11 w-11 place-items-center rounded-full bg-savannah text-[#102018] disabled:opacity-40"><Icon name="send" className="h-4 w-4" /></button></footer></> : <div className="grid flex-1 place-items-center text-center"><div><Icon name="communication" className="mx-auto h-10 w-10 text-[#444]" /><h2 className="mt-4 font-semibold text-[#aaa]">Choose a chat</h2><p className="mt-1 text-xs text-[#666]">Select a conversation or start a new one.</p></div></div>}</main>
    </div>
    {contactsOpen && recipients && <div className="fixed inset-0 z-50 flex justify-end bg-black/65" onClick={() => setContactsOpen(false)}><div className="h-full w-full max-w-md overflow-y-auto bg-[#151514] p-5" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">New chat</h2><button onClick={() => setContactsOpen(false)}><Icon name="close" className="h-5 w-5 text-[#888]" /></button></div><p className="mt-2 text-xs text-[#777]">Choose a person to start or reopen a direct conversation.</p><div className="mt-5 space-y-1">{recipients.map((recipient) => <button key={recipient.membershipId} disabled={pending} onClick={() => startChat(recipient.membershipId)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/5"><span className="grid h-10 w-10 place-items-center rounded-full bg-victoria/15 text-xs font-bold text-victoria">{initials(recipient.name)}</span><span><strong className="block text-sm text-white">{recipient.name}</strong><small className="capitalize text-[#777]">{recipient.accessType} · {recipient.email}</small></span></button>)}</div></div></div>}
  </section>;
}
