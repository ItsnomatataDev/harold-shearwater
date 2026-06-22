"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { createTask } from "../operations-actions";

export function CreateTaskForm({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await createTask(organizationId, { title, description, priority });
      setMessage("Task created successfully");
      setTitle("");
      setDescription("");
      setPriority("medium");
      setTimeout(() => {
        setOpen(false);
        window.location.reload();
      }, 2000);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to create task",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-6">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f0674e]"
        >
          <Icon name="plus" className="h-4 w-4" />
          Create task
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#b7b7b0]">
              Task title
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="mt-2 w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white placeholder:text-[#62625d] focus:border-victoria focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#b7b7b0]">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details or context…"
              rows={3}
              className="mt-2 w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white placeholder:text-[#62625d] focus:border-victoria focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#b7b7b0]">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white focus:border-victoria focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          {error && (
            <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-savannah/30 bg-savannah/10 px-4 py-3 text-xs text-[#84d4b0]">
              {message}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-sunset px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#f0674e] disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create task"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-2.5 text-xs font-semibold text-[#d6d6cf] transition hover:bg-[#30302e]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
