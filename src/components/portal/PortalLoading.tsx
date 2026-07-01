export function PortalLoading() {
  return (
    <section className="space-y-4">
      <div className="h-28 animate-pulse rounded-3xl border border-[#343431] bg-[#1d1d1b]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl border border-[#343431] bg-[#1d1d1b]" />
        <div className="h-40 animate-pulse rounded-2xl border border-[#343431] bg-[#1d1d1b]" />
      </div>
      <div className="h-56 animate-pulse rounded-2xl border border-[#343431] bg-[#1d1d1b]" />
    </section>
  );
}
