"use client";

import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icon";
import type { ProductWithDetails } from "@/features/products/products-service";
import type { ProductReviewSummary } from "@/features/products/reviews-service";
import { ProductBookingPanel } from "@/features/booking/ProductBookingPanel";
import { productSupportsAvailabilityCheck, isRoomTypeProduct } from "@/features/booking/availability-shared";
import { RoomTypeAvailabilityNotice } from "@/features/booking/RoomTypeAvailabilityNotice";

const CATEGORY_LABELS: Record<string, string> = {
  adventure: "Adventure",
  scenic: "Scenic",
  water: "Water Activities",
  cultural: "Cultural",
  multi_activity: "Multi-Activity",
  transfer: "Transfers",
  accommodation: "Accommodation",
};

const INCLUSION_GROUPS = [
  { type: "included", label: "Included", icon: "checkCircle", color: "text-emerald-400" },
  { type: "excluded", label: "Not included", icon: "xCircle", color: "text-red-400" },
  { type: "requirement", label: "Requirements", icon: "alertCircle", color: "text-yellow-400" },
  { type: "restriction", label: "Restrictions", icon: "alertCircle", color: "text-orange-400" },
] as const;

export type DetailRate = {
  planName: string;
  price: number;
  currency: string;
  notes: string | null;
  sourceLabel?: string | null;
};

function formatDuration(minutes: number | null): string {
  const h = Math.floor((minutes ?? 0) / 60);
  const m = (minutes ?? 0) % 60;
  if (!minutes) return "—";
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function ProductDetailView({
  product,
  rates = [],
  reviews = [],
  backHref,
  backLabel = "Back",
  audience,
  organizationId,
  goldenDuskConnected = false,
}: {
  product: ProductWithDetails;
  rates?: DetailRate[];
  reviews?: ProductReviewSummary[];
  backHref: string;
  backLabel?: string;
  audience: "agent" | "customer";
  organizationId?: string;
  goldenDuskConnected?: boolean;
}) {
  const category = CATEGORY_LABELS[product.category] ?? product.category;
  const supportsAvailability = productSupportsAvailabilityCheck(product);
  const isRoomType = isRoomTypeProduct(product);

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-[#85857d] transition hover:text-white"
      >
        <Icon name="arrow" className="h-3.5 w-3.5 rotate-180" />
        {backLabel}
      </Link>

      <div className="relative h-56 w-full overflow-hidden rounded-3xl border border-[#2f2f2b] bg-linear-to-br from-zinc-800 to-zinc-900 sm:h-72">
        {product.cover_image_url ? (
          <Image
            src={product.cover_image_url}
            alt={product.name}
            fill
            sizes="100vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[#55554f]">
            <Icon name="image" className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-6">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-savannah">
            {category}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-.02em] text-white sm:text-3xl">
            {product.name}
          </h1>
        </div>
      </div>

      {isRoomType && (
        <RoomTypeAvailabilityNotice />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="flex flex-wrap gap-4 rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5 text-sm">
            <div className="flex items-center gap-2 text-[#c8c8c0]">
              <Icon name="clock" className="h-4 w-4 text-savannah" />
              {formatDuration(product.duration_minutes)}
            </div>
            <div className="flex items-center gap-2 text-[#c8c8c0]">
              <Icon name="users" className="h-4 w-4 text-savannah" />
              {product.min_party_size}
              {product.max_party_size ? `–${product.max_party_size}` : "+"} pax
            </div>
            <div className="flex items-center gap-2 text-[#c8c8c0]">
              <Icon name="tag" className="h-4 w-4 text-savannah" />
              {category}
            </div>
          </div>

          {(product.short_description || product.full_description) && (
            <div className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
              <h2 className="text-sm font-semibold text-white">About this experience</h2>
              {product.short_description && (
                <p className="mt-3 text-sm leading-6 text-[#c8c8c0]">
                  {product.short_description}
                </p>
              )}
              {product.full_description && (
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#9b9b94]">
                  {product.full_description}
                </p>
              )}
            </div>
          )}

          {product.variants.length > 0 && (
            <div className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
              <h2 className="text-sm font-semibold text-white">Options</h2>
              <ul className="mt-3 space-y-2">
                {product.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="rounded-lg bg-[#222220] px-3 py-2"
                  >
                    <p className="text-sm font-medium text-white">{variant.name}</p>
                    {variant.description && (
                      <p className="text-xs text-[#85857d]">{variant.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.inclusions.length > 0 && (
            <div className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
              <h2 className="text-sm font-semibold text-white">What to expect</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {INCLUSION_GROUPS.map((group) => {
                  const items = product.inclusions.filter(
                    (inc) => inc.inclusion_type === group.type,
                  );
                  if (!items.length) return null;
                  return (
                    <div key={group.type}>
                      <p className={`text-xs font-semibold ${group.color}`}>
                        {group.label}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {items.map((inc) => (
                          <li key={inc.id} className="flex items-start gap-2">
                            <Icon
                              name={group.icon}
                              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${group.color}`}
                            />
                            <span className="text-xs leading-5 text-[#c8c8c0]">
                              {inc.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
              <h2 className="text-sm font-semibold text-white">Recent guest reviews</h2>
              <ul className="mt-3 space-y-3">
                {reviews.slice(0, 4).map((review) => (
                  <li key={review.id} className="rounded-lg bg-[#222220] px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-white">
                        {review.title ?? review.customerName}
                      </p>
                      <span className="text-xs text-savannah">
                        {"★".repeat(review.rating)}
                      </span>
                    </div>
                    {review.body && (
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-[#9b9b94]">
                        {review.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {audience === "agent" && (
            <div className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
              <h2 className="text-sm font-semibold text-white">Your contracted rates</h2>
              {rates.length ? (
                <ul className="mt-3 space-y-2">
                  {rates.map((rate, index) => (
                    <li
                      key={`${rate.planName}-${index}`}
                      className="flex items-center justify-between rounded-lg bg-[#222220] px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-medium text-white">{rate.planName}</p>
                        {rate.sourceLabel && (
                          <p className="text-[10px] text-[#6f8f6a]">{rate.sourceLabel}</p>
                        )}
                        {rate.notes && (
                          <p className="text-[10px] text-[#85857d]">{rate.notes}</p>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-savannah">
                        {rate.currency} {rate.price.toFixed(2)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-[#85857d]">
                  No contracted rate has been assigned for this product yet.
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5">
            <h2 className="text-sm font-semibold text-white">
              {audience === "agent" ? "Request a booking" : "Book now"}
            </h2>
            <p className="mt-1 mb-4 text-xs leading-5 text-[#85857d]">
              {audience === "agent"
                ? "Send a booking request on behalf of your client."
                : isRoomType
                  ? "Pick your dates, check how many units of this room type are free, then send a request. Shearwater assigns the exact room after confirmation."
                  : supportsAvailability
                    ? "Pick your dates, check live availability, then send a request."
                    : "Tell us your dates and party size to get started."}
            </p>
            <ProductBookingPanel
              product={product}
              audience={audience}
              organizationId={organizationId}
              goldenDuskConnected={goldenDuskConnected}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
