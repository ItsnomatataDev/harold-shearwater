type SyncRun = {
  id: string;
  resource_type: string;
  external_source: string;
  external_id: string | null;
  status: string;
  created_at: string;
  error_message: string | null;
};

export function CatalogSyncFeed({ runs }: { runs: SyncRun[] }) {
  if (!runs.length) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-[#1a1a18] px-4 py-5 text-sm text-zinc-500">
        No integration sync events yet. POST product and rate payloads to the
        catalog API endpoints to populate this workspace.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#1a1a18]">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-white">Recent API sync</h3>
      </div>
      <ul className="divide-y divide-zinc-800">
        {runs.map((run) => (
          <li key={run.id} className="px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-zinc-200">
                {run.resource_type} · {run.external_source}
                {run.external_id ? ` · ${run.external_id}` : ""}
              </span>
              <span
                className={
                  run.status === "applied"
                    ? "text-emerald-400"
                    : run.status === "failed"
                      ? "text-red-400"
                      : "text-yellow-400"
                }
              >
                {run.status}
              </span>
            </div>
            <p className="mt-1 text-zinc-500">
              {new Date(run.created_at).toLocaleString("en-GB", {
                timeZone: "Africa/Harare",
              })}
            </p>
            {run.error_message && (
              <p className="mt-1 text-red-400">{run.error_message}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
