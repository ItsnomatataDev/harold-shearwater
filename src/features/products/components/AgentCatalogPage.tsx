"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/features/products/products-service";
import { Icon } from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";
import type { RatePlanWithItems } from "@/features/products/rate-plans-service";
import type { ProductReviewSummary } from "@/features/products/reviews-service";

const CATEGORY_LABELS: Record<string, string> = {
  adventure: "Adventure",
  scenic: "Scenic",
  water: "Water Activities",
  cultural: "Cultural",
  multi_activity: "Multi-Activity",
  transfer: "Transfers",
  accommodation: "Accommodation",
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function ProductCard({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#1a1a18] rounded-xl border border-zinc-800 overflow-hidden hover:border-[var(--color-gold)] transition-colors group"
    >
      <div className="relative h-32 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
        {product.cover_image_url ? (
          <Image
            src={product.cover_image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <Icon name="image" className="w-8 h-8 text-zinc-700" />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-[var(--color-gold)] transition-colors text-sm leading-snug">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {product.short_description}
          </p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-zinc-500">
          {product.duration_minutes && (
            <span className="flex items-center gap-1">
              <Icon name="clock" className="w-3 h-3" />
              {formatDuration(product.duration_minutes)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icon name="users" className="w-3 h-3" />
            {product.min_party_size}
            {product.max_party_size ? `–${product.max_party_size}` : "+"} pax
          </span>
        </div>
      </div>
    </button>
  );
}

function ProductModal({
  product,
  rates,
  reviews,
  onClose,
}: {
  product: Product;
  rates: { planName: string; price: number; currency: string; notes: string | null }[];
  reviews: ProductReviewSummary[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#111110] rounded-2xl border border-zinc-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-48 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center relative">
          {product.cover_image_url ? (
            <Image
              src={product.cover_image_url}
              alt={product.name}
              fill
              sizes="512px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <Icon name="image" className="w-12 h-12 text-zinc-700" />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60"
          >
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-xs text-[var(--color-gold)] font-medium mb-1 capitalize">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </p>
          <h2 className="text-xl font-bold text-white mb-2">{product.name}</h2>
          {product.short_description && (
            <p className="text-sm text-zinc-400 mb-4">
              {product.short_description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            {product.duration_minutes && (
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Duration</p>
                <p className="text-sm text-white font-medium">
                  {formatDuration(product.duration_minutes)}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Party Size</p>
              <p className="text-sm text-white font-medium">
                {product.min_party_size}
                {product.max_party_size
                  ? `–${product.max_party_size}`
                  : "+"}{" "}
                pax
              </p>
            </div>
          </div>

          {product.full_description && (
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                {product.full_description}
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-zinc-800 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Your contracted rates
            </p>
            {rates.length ? (
              <ul className="mt-2 space-y-2">
                {rates.map((rate, index) => (
                  <li key={`${rate.planName}-${index}`} className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2">
                    <div>
                      <p className="text-xs font-medium text-white">{rate.planName}</p>
                      {rate.notes ? <p className="text-[10px] text-zinc-500">{rate.notes}</p> : null}
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-gold)]">
                      {rate.currency} {rate.price.toFixed(2)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">No contracted rate has been assigned for this product.</p>
            )}
          </div>

          {reviews.length ? (
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recent guest reviews</p>
              <ul className="mt-2 space-y-2">
                {reviews.slice(0, 2).map((review) => (
                  <li key={review.id} className="rounded-lg bg-zinc-900 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-white">{review.title ?? review.customerName}</p>
                      <span className="text-xs text-gold">{"★".repeat(review.rating)}</span>
                    </div>
                    {review.body ? <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-500">{review.body}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 pt-4 border-t border-zinc-800">
            <Link
              href="/agent/enquiries"
              className="btn-primary w-full text-center block"
            >
              Submit Enquiry
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AgentCatalogPage({
  byCategory,
  ratePlans,
  reviews,
}: {
  byCategory: Record<string, Product[]>;
  ratePlans: RatePlanWithItems[];
  reviews: ProductReviewSummary[];
}) {
  const [selected, setSelected] = useState<Product | null>(null);

  const categories = Object.keys(byCategory).sort();
  const totalProducts = Object.values(byCategory).reduce(
    (s, p) => s + p.length,
    0,
  );
  const ratesByProduct = ratePlans.flatMap((plan) =>
    plan.items.map((item) => ({
      productId: item.product_id,
      planName: plan.name,
      price: item.price_per_person,
      currency: item.currency,
      notes: item.notes,
    })),
  );

  return (
    <div className="shell-content">
      <SectionHeader
        title="Product Catalog"
        subtitle={`${totalProducts} active product${totalProducts !== 1 ? "s" : ""} available to book`}
      />

      {totalProducts === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Icon name="package" className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No products available yet. Check back soon.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-[var(--color-gold)] mb-4 uppercase tracking-wide">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {byCategory[category].map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => setSelected(product)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ProductModal
          product={selected}
          rates={ratesByProduct.filter((rate) => rate.productId === selected.id)}
          reviews={reviews.filter((review) => review.productId === selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
