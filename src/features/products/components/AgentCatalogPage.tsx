"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { Product } from "@/features/products/products-service";
import { Icon } from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";
import type { RatePlanWithItems } from "@/features/products/rate-plans-service";

const CATEGORY_LABELS: Record<string, string> = {
  adventure: "Adventure",
  scenic: "Scenic",
  water: "Water Activities",
  cultural: "Cultural",
  multi_activity: "Multi-Activity",
  transfer: "Transfers",
  accommodation: "Accommodation",
};

type CatalogScope = "all" | "accommodation" | "activities";

const SCOPE_TABS: { id: CatalogScope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "accommodation", label: "Accommodation" },
  { id: "activities", label: "Activities" },
];

function formatDuration(minutes: number | null): string {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/agent/products/${product.id}`}
      className="block text-left bg-[#1a1a18] rounded-xl border border-zinc-800 overflow-hidden hover:border-gold transition-colors group"
    >
      <div className="relative h-32 bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
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
        <h3 className="font-semibold text-white group-hover:text-gold transition-colors text-sm leading-snug">
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
    </Link>
  );
}

export default function AgentCatalogPage({
  byCategory,
  ratePlans,
}: {
  byCategory: Record<string, Product[]>;
  ratePlans: RatePlanWithItems[];
}) {
  const [scope, setScope] = useState<CatalogScope>("all");

  const filteredByCategory = useMemo(() => {
    if (scope === "all") return byCategory;

    const next: Record<string, Product[]> = {};
    for (const [category, products] of Object.entries(byCategory)) {
      const filtered =
        scope === "accommodation"
          ? products.filter((product) => product.category === "accommodation")
          : products.filter((product) => product.category !== "accommodation");

      if (filtered.length) next[category] = filtered;
    }
    return next;
  }, [byCategory, scope]);

  const categories = Object.keys(filteredByCategory).sort();
  const totalProducts = Object.values(filteredByCategory).reduce(
    (s, p) => s + p.length,
    0,
  );
  const catalogTotal = Object.values(byCategory).reduce((s, p) => s + p.length, 0);
  const totalRates = ratePlans.reduce((sum, plan) => sum + plan.items.length, 0);

  return (
    <div className="shell-content">
      <SectionHeader
        title="Product Catalog"
        subtitle={
          catalogTotal === 0
            ? "No active products synced yet."
            : `${catalogTotal} active product${catalogTotal !== 1 ? "s" : ""} · ${ratePlans.length} rate plan${ratePlans.length !== 1 ? "s" : ""} (${totalRates} contracted price${totalRates !== 1 ? "s" : ""})`
        }
      />

      {catalogTotal > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {SCOPE_TABS.map((tab) => {
            const active = scope === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? "bg-gold text-black"
                    : "border border-zinc-700 text-zinc-400 hover:border-gold hover:text-gold"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {catalogTotal === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Icon name="package" className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No products available yet. Check back soon.</p>
        </div>
      ) : totalProducts === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Icon name="package" className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No products in this view.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-gold mb-4 uppercase tracking-wide">
                {CATEGORY_LABELS[category] ?? category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredByCategory[category].map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
