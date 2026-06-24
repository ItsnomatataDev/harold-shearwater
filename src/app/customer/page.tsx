export default async function CustomerPortalPage() {
  return (
      <section className="w-full rounded-3xl border border-[#343431] bg-[#1d1d1b] p-8">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-savannah">
          Customer Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Guest workspace
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#91918b]">
          You are authenticated as a Customer user. This portal is access-gated
          and only visible to active customer memberships.
        </p>
      </section>
  );
}
