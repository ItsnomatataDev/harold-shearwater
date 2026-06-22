"use client";

export function OrgSettings({
  orgName,
  orgSlug,
}: {
  orgName: string | null;
  orgSlug: string | null;
}) {
  return (
    <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-6">
      <h3 className="text-lg font-semibold text-white">
        Organization Settings
      </h3>
      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#b7b7b0]">
            Organization Name
          </label>
          <input
            type="text"
            value={orgName || ""}
            disabled
            className="mt-2 w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-[#8a8a84]"
          />
          <p className="mt-1 text-xs text-[#62625d]">Contact admin to change</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#b7b7b0]">
            Slug
          </label>
          <input
            type="text"
            value={orgSlug || ""}
            disabled
            className="mt-2 w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-[#8a8a84]"
          />
        </div>
      </div>
    </div>
  );
}
