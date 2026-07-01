import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";
import {
  getAvailabilityRoomProducts,
  getCustomerCatalogByCategory,
} from "@/features/products/products-service";
import {
  AvailabilityCheck,
  type RoomMetaMap,
} from "@/features/booking/AvailabilityCheck";
import {
  ApiPendingPanel,
  CustomerPageHeader,
  EmptyState,
} from "@/features/customer/components/CustomerPortalCards";

export const metadata = { title: "Explore Experiences" };

function formatCategory(category: string) {
  return category.replace(/_/g, " ");
}

export default async function CustomerExplorePage() {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");

  const [byCategory, rooms] = await Promise.all([
    getCustomerCatalogByCategory(),
    getAvailabilityRoomProducts(),
  ]);
  const categories = Object.keys(byCategory).sort();
  const hasCatalog = categories.length > 0;

  const roomMeta: RoomMetaMap = Object.fromEntries(
    Object.values(rooms)
      .filter((room): room is NonNullable<typeof room> => Boolean(room))
      .map((room) => [
        room.unitKey,
        {
          href: `/customer/explore/${room.id}`,
          description: room.shortDescription,
          productId: room.id,
          productName: room.name,
        },
      ]),
  );

  return (
    <div className="space-y-6">
      <HaroldModuleContext
        moduleId="explore"
        summary={`Customer is browsing ${categories.length} catalog categories`}
        data={{ categories }}
      />
      <CustomerPageHeader
        eyebrow="Explore"
        title="Find the right Shearwater experience"
        description="Browse the live operator catalog. Products here stay in sync with the same source the team and agent dashboards use, so updates appear automatically."
      />

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-[.14em] text-savannah">
            Check availability
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#8e8e87]">
            Pick your dates to see how many units are free in each room type.
            Exact room numbers are assigned after Shearwater confirms your
            booking.
          </p>
        </div>
        <AvailabilityCheck roomMeta={roomMeta} />
      </section>

      {hasCatalog ? (
        <div className="space-y-8">
          {categories.map((category) => (
            <section key={category}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-[.14em] text-savannah">
                  {formatCategory(category)}
                </h2>
                <span className="text-xs text-[#77776f]">
                  {byCategory[category].length}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {byCategory[category].map((product) => (
                  <Link
                    key={product.id}
                    href={`/customer/explore/${product.id}`}
                    className="group overflow-hidden rounded-2xl border border-[#2f2f2b] bg-[#181816] transition hover:border-savannah/50 hover:bg-[#20201d]"
                  >
                    <div className="relative h-36 w-full bg-[#222220]">
                      {product.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.cover_image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[#55554f]">
                          <Icon name="image" className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="text-base font-semibold text-white group-hover:text-savannah">
                        {product.name}
                      </h3>
                      {product.short_description && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#9b9b94]">
                          {product.short_description}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#85857d]">
                        {product.duration_minutes ? (
                          <span className="inline-flex items-center gap-1">
                            <Icon name="clock" className="h-3.5 w-3.5" />
                            {product.duration_minutes} min
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <Icon name="users" className="h-3.5 w-3.5" />
                          {product.min_party_size}
                          {product.max_party_size
                            ? `–${product.max_party_size}`
                            : "+"}{" "}
                          pax
                        </span>
                      </div>
                      <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-savannah">
                        View &amp; book
                        <Icon name="arrow" className="h-3.5 w-3.5" />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="package"
          title="Customer catalog coming through the API"
          description="Active products will appear here automatically once the operator catalog is synced through the integration API."
          action={
            <Link href="/customer/chat" className="btn-ghost text-sm">
              Ask Harold for guidance
            </Link>
          }
        />
      )}

      <ApiPendingPanel
        title="Availability must be authoritative"
        description="The portal can help guests discover and compare experiences, but it never presents stale availability or estimated pricing as confirmed."
        points={[
          "Catalog shares the synced source of truth",
          "Pricing waits for the availability API",
          "Harold cannot invent availability",
          "Payment flow stays out of scope for now",
        ]}
      />
    </div>
  );
}
