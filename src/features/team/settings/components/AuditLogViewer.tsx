"use client";

import type { AuditLogEntry } from "../settings-service";

export function AuditLogViewer({ logs }: { logs: AuditLogEntry[] }) {
  return (
    <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b]">
      <div className="border-b border-[#343431] px-6 py-4">
        <h3 className="text-lg font-semibold text-white">Audit Log</h3>
        <p className="mt-1 text-xs text-[#8a8a84]">
          Last 50 actions in this organization
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-[#343431] bg-[#232321] text-xs font-semibold uppercase tracking-[.09em] text-[#b7b7b0]">
            <tr>
              <th className="px-6 py-3 text-left">Time</th>
              <th className="px-6 py-3 text-left">Action</th>
              <th className="px-6 py-3 text-left">Entity</th>
              <th className="px-6 py-3 text-left">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#343431]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#232321] transition">
                <td className="px-6 py-4 text-xs text-[#8a8a84]">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-xs font-mono text-white">
                  {log.action}
                </td>
                <td className="px-6 py-4 text-xs text-[#d6d6cf]">
                  <div>
                    <p className="font-semibold">{log.entityType}</p>
                    {log.entityId && (
                      <p className="text-[#8a8a84]">
                        {log.entityId.substring(0, 8)}…
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-[#8a8a84]">
                  {log.actorEmail}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logs.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-[#8a8a84]">No audit logs yet</p>
        </div>
      )}
    </div>
  );
}
