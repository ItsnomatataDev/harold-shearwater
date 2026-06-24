"use client";

import { useState, useActionState } from "react";
import {
  addAnnouncement,
  publishAnnouncement,
  toggleAnnouncementPin,
  deleteAnnouncement,
  type AnnouncementFormState,
} from "./announcements-actions";
import type { Announcement } from "./announcements-service";
import { Icon } from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";

const AUDIENCE_LABELS: Record<string, string> = {
  everyone: "Everyone",
  team: "Team Only",
  agents: "Agents Only",
  managers: "Managers",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TeamAnnouncementsPage({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [formState, formAction, isPending] = useActionState(
    addAnnouncement,
    {} as AnnouncementFormState,
  );

  const published = announcements.filter((a) => a.published_at);
  const drafts = announcements.filter((a) => !a.published_at);

  return (
    <div className="shell-content">
      <SectionHeader
        title="Announcements"
        subtitle="Post updates, news and pinned notices for your team and agents."
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Icon name="plus" className="w-4 h-4" />
            New Announcement
          </button>
        }
      />

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-zinc-500 uppercase mb-3">
            Drafts ({drafts.length})
          </h3>
          <div className="space-y-3">
            {drafts.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} isDraft />
            ))}
          </div>
        </div>
      )}

      {/* Published */}
      <div>
        <h3 className="text-xs font-medium text-zinc-500 uppercase mb-3">
          Published ({published.length})
        </h3>
        {published.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Icon
              name="megaphone"
              className="w-8 h-8 mx-auto mb-2 opacity-40"
            />
            <p className="text-sm">No published announcements yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {published.map((a) => (
              <AnnouncementCard key={a.id} announcement={a} />
            ))}
          </div>
        )}
      </div>

      {/* Add slide-over */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex justify-end"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-lg bg-[#111110] border-l border-zinc-800 h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                New Announcement
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-zinc-400 hover:text-white"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {formState.success ? (
              <div className="text-center py-12">
                <p className="text-emerald-400 font-medium mb-4">
                  Announcement saved!
                </p>
                <button
                  onClick={() => {
                    setShowAdd(false);
                  }}
                  className="btn-ghost"
                >
                  Close
                </button>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                {formState.error && (
                  <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded">
                    {formState.error}
                  </p>
                )}

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Title *
                  </label>
                  <input
                    name="title"
                    required
                    className="input w-full"
                    placeholder="e.g. Peak season schedule changes"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Message *
                  </label>
                  <textarea
                    name="body"
                    required
                    className="input w-full"
                    rows={6}
                    placeholder="Write your announcement here…"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Audience
                  </label>
                  <select name="audience" className="input w-full">
                    <option value="everyone">Everyone</option>
                    <option value="team">Team Only</option>
                    <option value="agents">Agents Only</option>
                    <option value="managers">Managers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Expires (optional)
                  </label>
                  <input
                    name="expires_at"
                    type="date"
                    className="input w-full"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input name="pinned" type="checkbox" className="rounded" />
                    Pin to top
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input
                      name="publish_now"
                      type="checkbox"
                      className="rounded"
                      defaultChecked
                    />
                    Publish now
                  </label>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary flex-1"
                  >
                    {isPending ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({
  announcement: a,
  isDraft,
}: {
  announcement: Announcement;
  isDraft?: boolean;
}) {
  return (
    <div className="bg-[#1a1a18] rounded-xl border border-zinc-800 p-5">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {a.pinned && (
              <Icon
                name="pin"
                className="w-3.5 h-3.5 text-[var(--color-sunset)] shrink-0"
              />
            )}
            <span className="text-xs text-zinc-500">
              {AUDIENCE_LABELS[a.audience]}
              {a.published_at ? ` · ${formatDate(a.published_at)}` : ""}
            </span>
          </div>
          <h3 className="font-semibold text-white">{a.title}</h3>
          <p className="text-sm text-zinc-400 mt-1 line-clamp-3">{a.body}</p>
          <p className="mt-3 text-[11px] text-zinc-500">
            {isDraft ? "Created" : "Posted"} by{" "}
            <span className="font-medium text-zinc-300">{a.author_name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isDraft && (
            <form action={publishAnnouncement.bind(null, a.id)}>
              <button className="text-xs text-emerald-400 hover:text-emerald-300">
                Publish
              </button>
            </form>
          )}
          <form action={toggleAnnouncementPin.bind(null, a.id, !a.pinned)}>
            <button
              className={`text-xs ${a.pinned ? "text-[var(--color-sunset)]" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {a.pinned ? "Unpin" : "Pin"}
            </button>
          </form>
          <form action={deleteAnnouncement.bind(null, a.id)}>
            <button className="text-zinc-600 hover:text-red-400 transition-colors">
              <Icon name="trash" className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
