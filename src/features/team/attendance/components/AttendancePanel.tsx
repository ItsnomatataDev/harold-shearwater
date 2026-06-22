"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clockIn, clockOut } from "../attendance-actions";
import type { AttendanceData } from "../attendance-service";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
}

export function AttendancePanel({
  organizationId,
  membershipId,
  data,
}: {
  organizationId: string;
  membershipId: string;
  data: AttendanceData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClockIn() {
    setLoading(true);
    setError(null);

    try {
      await clockIn(organizationId, membershipId);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Clock-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOut() {
    setLoading(true);
    setError(null);

    try {
      await clockOut(organizationId, membershipId);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Clock-out failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-6">
        <h2 className="text-lg font-semibold text-white">Today</h2>
        <p className="mt-2 text-sm text-[#9a9a94]">
          {data.activeEntry
            ? `Clocked in at ${formatDateTime(data.activeEntry.clockedInAt)}`
            : "You are currently clocked out."}
        </p>
        {data.activeEntry && (
          <p className="mt-1 text-xs font-medium text-savannah">
            {formatDuration(data.activeEntry.workedMinutes)} worked so far
          </p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleClockIn}
            disabled={loading || Boolean(data.activeEntry)}
            className="rounded-xl bg-savannah px-4 py-2 text-xs font-semibold text-[#10120f] disabled:opacity-50"
          >
            Clock in
          </button>
          <button
            onClick={handleClockOut}
            disabled={loading || !data.activeEntry}
            className="rounded-xl bg-sunset px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Clock out
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[#343431] bg-[#1d1d1b]">
        <header className="border-b border-[#343431] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Recent entries</h2>
        </header>
        <div className="divide-y divide-[#343431]">
          {data.recentEntries.length ? (
            data.recentEntries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 text-sm">
                <p className="font-semibold text-white">
                  In: {formatDateTime(entry.clockedInAt)}
                </p>
                <p className="mt-1 text-[#9a9a94]">
                  Out:{" "}
                  {entry.clockedOutAt
                    ? formatDateTime(entry.clockedOutAt)
                    : "Still active"}
                </p>
                <p className="mt-1 text-xs text-[#72726c]">
                  Duration: {formatDuration(entry.workedMinutes)}
                </p>
              </div>
            ))
          ) : (
            <p className="px-6 py-8 text-sm text-[#8a8a84]">
              No attendance history yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
