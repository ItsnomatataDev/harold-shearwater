"use client";

import { useActionState, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { deliverDocument, markDocumentRead } from "./document-inbox-actions";
import type { DocumentInboxItem, DocumentRecipient } from "./document-inbox-service";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentInboxPage({
  documents,
  recipients,
}: {
  documents: DocumentInboxItem[];
  recipients?: DocumentRecipient[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deliverDocument, {});
  const [, startTransition] = useTransition();

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-gold">Secure document delivery</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Document Inbox</h1>
          <p className="mt-2 text-sm text-[#85857f]">Vouchers, confirmations, itineraries, contracts and other files—messages live in Chat.</p>
        </div>
        {recipients && <button onClick={() => setOpen(true)} className="btn-primary">Send document</button>}
      </header>

      <div className="grid gap-3">
        {documents.map((document) => (
          <article key={document.deliveryId} className={`rounded-2xl border p-5 ${document.readAt ? "border-[#343431] bg-[#1d1d1b]" : "border-gold/30 bg-gold/5"}`}>
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold"><Icon name="file" className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-white">{document.title}</h2>
                  {!document.readAt && <span className="rounded-full bg-sunset px-2 py-0.5 text-[8px] font-bold uppercase text-white">New</span>}
                </div>
                {document.description && <p className="mt-1 text-xs leading-5 text-[#8d8d87]">{document.description}</p>}
                <p className="mt-3 text-[10px] text-[#696963]">From {document.senderName} · {new Date(document.deliveredAt).toLocaleString()} {document.recipientName ? `· To ${document.recipientName}` : ""}</p>
              </div>
              <a
                href={document.downloadUrl ?? "#"}
                aria-disabled={!document.downloadUrl}
                onClick={() => {
                  if (!document.readAt) startTransition(() => markDocumentRead(document.deliveryId));
                }}
                className="btn-ghost shrink-0 text-xs"
              >
                Download {formatSize(document.fileSizeBytes)}
              </a>
            </div>
          </article>
        ))}
        {!documents.length && <div className="rounded-2xl border border-dashed border-[#3b3b38] px-6 py-16 text-center"><Icon name="file" className="mx-auto h-8 w-8 text-[#555]" /><p className="mt-3 text-sm text-[#888]">No documents have been delivered yet.</p></div>}
      </div>

      {open && recipients && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65" onClick={() => setOpen(false)}>
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-[#343431] bg-[#151514] p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Send a document</h2><button onClick={() => setOpen(false)}><Icon name="close" className="h-5 w-5 text-[#888]" /></button></div>
            <form action={action} className="mt-6 space-y-4">
              {state.error && <p className="rounded-xl bg-sunset/10 px-3 py-2 text-xs text-sunset">{state.error}</p>}
              {state.success && <p className="rounded-xl bg-savannah/10 px-3 py-2 text-xs text-savannah">Document delivered.</p>}
              <input name="title" required placeholder="Document title" className="input w-full" />
              <textarea name="description" placeholder="Short description (optional)" rows={3} className="input w-full" />
              <select name="document_type" className="input w-full" defaultValue="general">
                {['general','voucher','confirmation','itinerary','contract','fact_sheet','policy','media'].map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
              </select>
              <input name="file" type="file" required className="input w-full" />
              <fieldset className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-[#343431] p-3">
                <legend className="px-2 text-xs font-semibold text-[#aaa]">Recipients</legend>
                {recipients.map((recipient) => (
                  <label key={`${recipient.accessType}:${recipient.membershipId}`} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
                    <input name="recipients" type="checkbox" value={JSON.stringify(recipient)} />
                    <span className="min-w-0"><span className="block truncate text-xs font-medium text-white">{recipient.name}</span><span className="text-[10px] capitalize text-[#777]">{recipient.accessType} · {recipient.email}</span></span>
                  </label>
                ))}
              </fieldset>
              <button disabled={pending} className="btn-primary w-full">{pending ? "Delivering…" : "Deliver document"}</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
