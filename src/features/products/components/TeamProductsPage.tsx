"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import {
  addProduct,
  setProductStatus,
} from "@/features/products/products-actions";
import type { Product } from "@/features/products/products-service";
import { Icon } from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";
import { CatalogApiNotice } from "@/components/catalog/CatalogApiNotice";
import { CatalogSyncFeed } from "@/components/catalog/CatalogSyncFeed";

const CATEGORIES = [
  { value: "adventure", label: "Adventure" },
  { value: "scenic", label: "Scenic" },
  { value: "water", label: "Water" },
  { value: "cultural", label: "Cultural" },
  { value: "multi_activity", label: "Multi-Activity" },
  { value: "transfer", label: "Transfer" },
  { value: "accommodation", label: "Accommodation" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-900/30 text-yellow-400",
  active: "bg-emerald-900/30 text-emerald-400",
  archived: "bg-zinc-700 text-zinc-400",
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function TeamProductsPage({
  products,
  canManage = false,
  basePath = "/team/products",
  usage,
  syncRuns = [],
}: {
  products: Product[];
  canManage?: boolean;
  basePath?: string;
  usage?: {
    totalProducts: number;
    activeProducts: number;
    syncedProducts: number;
    externalProducts: number;
    syncErrors: number;
  };
  syncRuns?: Array<{
    id: string;
    resource_type: string;
    external_source: string;
    external_id: string | null;
    status: string;
    created_at: string;
    error_message: string | null;
  }>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "draft" | "active" | "archived">(
    "all",
  );
  const [formState, formAction, isPending] = useActionState(addProduct, {});

  const filtered =
    filter === "all" ? products : products.filter((p) => p.status === filter);

  const counts = {
    all: products.length,
    draft: products.filter((p) => p.status === "draft").length,
    active: products.filter((p) => p.status === "active").length,
    archived: products.filter((p) => p.status === "archived").length,
  };

  return (
    <div className="shell-content">
      <CatalogApiNotice />
      <SectionHeader
        title="Products"
        subtitle="Read-only catalog synced from the integration API."
        action={
          canManage ? (
            <button
              onClick={() => setShowAdd(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add Product
            </button>
          ) : undefined
        }
      />

      {usage && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Total", usage.totalProducts],
            ["Active", usage.activeProducts],
            ["Synced", usage.syncedProducts],
            ["External feeds", usage.externalProducts],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-800 bg-[#1a1a18] px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-[.14em] text-zinc-500">
                {label}
              </p>
              <p className="mt-1 text-xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-6 bg-[#1a1a18] rounded-lg p-1 w-fit">
        {(["all", "active", "draft", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded text-sm font-medium capitalize transition-colors ${
              filter === s
                ? "bg-[#2b2b29] text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {s} <span className="text-xs text-zinc-500">({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Icon name="package" className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {filter === "all"
              ? "No products yet. Add your first experience."
              : `No ${filter} products.`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Duration</th>
                <th className="text-left px-4 py-3">Party Size</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`${basePath}/${product.id}`}
                      className="font-medium text-white hover:text-sunset transition-colors"
                    >
                      {product.name}
                    </Link>
                    {product.external_source && product.external_source !== "manual" && (
                      <p className="mt-1 text-[10px] uppercase tracking-[.12em] text-zinc-500">
                        {product.external_source} · {product.sync_status ?? "manual"}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-300 capitalize">
                    {product.category.replace("_", " ")}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatDuration(product.duration_minutes)}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {product.min_party_size}
                    {product.max_party_size
                      ? `–${product.max_party_size}`
                      : "+"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[product.status]}`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canManage && product.status === "draft" && (
                        <form
                          action={setProductStatus.bind(
                            null,
                            product.id,
                            "active",
                          )}
                        >
                          <button className="text-xs text-emerald-400 hover:text-emerald-300">
                            Publish
                          </button>
                        </form>
                      )}
                      {canManage && product.status === "active" && (
                        <form
                          action={setProductStatus.bind(
                            null,
                            product.id,
                            "draft",
                          )}
                        >
                          <button className="text-xs text-yellow-400 hover:text-yellow-300">
                            Unpublish
                          </button>
                        </form>
                      )}
                      <Link
                        href={`${basePath}/${product.id}`}
                        className="text-xs text-zinc-400 hover:text-white"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <CatalogSyncFeed runs={syncRuns} />
      </div>

      {/* Add product slide-over */}
      {canManage && showAdd && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex justify-end"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-lg bg-[#111110] border-l border-zinc-800 h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Add Product</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="text-zinc-400 hover:text-white"
              >
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>

            {formState.success ? (
              <div className="text-center py-12">
                <p className="text-emerald-400 font-medium mb-4">
                  Product created!
                </p>
                <Link
                  href={`${basePath}/${formState.productId}`}
                  className="btn-primary"
                  onClick={() => setShowAdd(false)}
                >
                  Add variants & inclusions
                </Link>
              </div>
            ) : (
              <form action={formAction} className="space-y-4">
                {formState.error && (
                  <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded">
                    {formState.error}
                  </p>
                )}

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Name *
                  </label>
                  <input
                    name="name"
                    required
                    className="input w-full"
                    placeholder="e.g. Victoria Falls Helicopter Tour"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Category *
                  </label>
                  <select name="category" required className="input w-full">
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Short Description
                  </label>
                  <input
                    name="short_description"
                    className="input w-full"
                    placeholder="One-line summary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      name="duration_minutes"
                      type="number"
                      min="1"
                      className="input w-full"
                      placeholder="e.g. 60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Min Party Size
                    </label>
                    <input
                      name="min_party_size"
                      type="number"
                      min="1"
                      defaultValue="1"
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Max Party Size (leave blank for unlimited)
                  </label>
                  <input
                    name="max_party_size"
                    type="number"
                    min="1"
                    className="input w-full"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary flex-1"
                  >
                    {isPending ? "Saving…" : "Create Product"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="btn-ghost flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
