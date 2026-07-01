export function CatalogApiNotice({
  resourceLabel = "Products and rates",
}: {
  resourceLabel?: string;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-victoria/20 bg-victoria/5 px-4 py-3 text-sm text-[#c8d8df]">
      <p className="font-medium text-white">{resourceLabel} are API-managed</p>
      <p className="mt-1 text-xs leading-5 text-[#9ab0b8]">
        Shearwater staff and administrators can view catalog usage here. Updates
        arrive through the integration endpoints and agency company records are
        matched by external IDs.
      </p>
    </div>
  );
}
