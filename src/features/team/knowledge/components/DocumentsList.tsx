"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { Document } from "../knowledge-service";
import { publishDocument, archiveDocument } from "../knowledge-actions";

export function DocumentsList({
  documents,
  organizationId,
}: {
  documents: Document[];
  organizationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish(docId: string) {
    setLoading(true);
    setError(null);

    try {
      await publishDocument(organizationId, docId);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  const categories = Array.from(new Set(documents.map((d) => d.category)));

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </div>
      )}

      {categories.map((category) => {
        const docs = documents.filter((d) => d.category === category);
        return (
          <div
            key={category}
            className="rounded-2xl border border-[#343431] bg-[#1d1d1b]"
          >
            <div className="border-b border-[#343431] px-6 py-4">
              <h3 className="text-lg font-semibold text-white capitalize">
                {category}
              </h3>
            </div>
            <div className="divide-y divide-[#343431]">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between px-6 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      {doc.title}
                    </p>
                    {doc.description && (
                      <p className="mt-1 text-xs text-[#8a8a84]">
                        {doc.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.09em] ${
                          doc.status === "published"
                            ? "bg-savannah/10 text-savannah"
                            : "bg-gold/10 text-gold"
                        }`}
                      >
                        {doc.status}
                      </span>
                      <span className="text-[10px] text-[#8a8a84]">
                        by {doc.createdByName || "Unknown"}
                      </span>
                    </div>
                  </div>
                  {doc.status === "draft" && (
                    <button
                      disabled={loading}
                      onClick={() => handlePublish(doc.id)}
                      className="ml-4 rounded-lg border border-savannah/30 bg-savannah/10 px-3 py-2 text-xs font-semibold text-savannah transition hover:bg-savannah/20 disabled:opacity-50"
                    >
                      Publish
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {documents.length === 0 && (
        <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b] px-6 py-12 text-center">
          <p className="text-sm text-[#8a8a84]">No documents yet</p>
        </div>
      )}
    </div>
  );
}
