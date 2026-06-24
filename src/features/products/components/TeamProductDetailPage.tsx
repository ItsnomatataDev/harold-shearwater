"use client";

import { useState } from "react";
import Link from "next/link";
import {
  setProductStatus,
  addProductVariant,
  deleteProductVariant,
  addProductInclusion,
  deleteProductInclusion,
} from "@/features/products/products-actions";
import type { ProductWithDetails } from "@/features/products/products-service";
import { Icon } from "@/components/Icon";
import SectionHeader from "@/components/SectionHeader";

const INCLUSION_COLORS: Record<string, string> = {
  included: "text-emerald-400",
  excluded: "text-red-400",
  requirement: "text-yellow-400",
  restriction: "text-orange-400",
};

const INCLUSION_ICONS: Record<string, string> = {
  included: "checkCircle",
  excluded: "xCircle",
  requirement: "alertCircle",
  restriction: "alertCircle",
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export default function TeamProductDetailPage({
  product,
}: {
  product: ProductWithDetails;
}) {
  const [addVariantOpen, setAddVariantOpen] = useState(false);
  const [addInclusionOpen, setAddInclusionOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddVariant(formData: FormData) {
    const result = await addProductVariant(product.id, formData);
    if (result.error) setError(result.error);
    else setAddVariantOpen(false);
  }

  async function handleAddInclusion(formData: FormData) {
    const result = await addProductInclusion(product.id, formData);
    if (result.error) setError(result.error);
    else setAddInclusionOpen(false);
  }

  return (
    <div className="shell-content">
      <SectionHeader
        title={product.name}
        subtitle={`${product.category.replace("_", " ")} · ${formatDuration(product.duration_minutes)}`}
        action={
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                product.status === "active"
                  ? "bg-emerald-900/30 text-emerald-400"
                  : product.status === "draft"
                    ? "bg-yellow-900/30 text-yellow-400"
                    : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {product.status}
            </span>
            {product.status === "draft" && (
              <form action={setProductStatus.bind(null, product.id, "active")}>
                <button className="btn-primary text-sm">Publish</button>
              </form>
            )}
            {product.status === "active" && (
              <form action={setProductStatus.bind(null, product.id, "draft")}>
                <button className="text-sm text-yellow-400 hover:text-yellow-300">
                  Unpublish
                </button>
              </form>
            )}
            <Link href="/admin/products" className="btn-ghost text-sm">
              ← Products
            </Link>
          </div>
        }
      />

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded mb-4">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Details */}
        <div className="bg-[#1a1a18] rounded-xl border border-zinc-800 p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Details</h3>
          <dl className="space-y-3">
            {[
              ["Short description", product.short_description || "—"],
              ["Duration", formatDuration(product.duration_minutes)],
              [
                "Party size",
                `${product.min_party_size}${product.max_party_size ? `–${product.max_party_size}` : "+"} pax`,
              ],
              ["Category", product.category.replace("_", " ")],
              ["Slug", product.slug],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-4">
                <dt className="text-xs text-zinc-500 w-36 shrink-0">{label}</dt>
                <dd className="text-sm text-zinc-200 capitalize">{value}</dd>
              </div>
            ))}
          </dl>
          {product.full_description && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Full description</p>
              <p className="text-sm text-zinc-300 whitespace-pre-line">
                {product.full_description}
              </p>
            </div>
          )}
        </div>

        {/* Variants */}
        <div className="bg-[#1a1a18] rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Variants</h3>
            <button
              onClick={() => setAddVariantOpen(true)}
              className="text-xs text-[var(--color-sunset)] hover:opacity-80"
            >
              + Add
            </button>
          </div>

          {product.variants.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No variants yet. Add variants to differentiate pricing options
              (e.g. &ldquo;Standard&rdquo;, &ldquo;Premium&rdquo;).
            </p>
          ) : (
            <ul className="space-y-2">
              {product.variants.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{v.name}</p>
                    {v.description && (
                      <p className="text-xs text-zinc-500">{v.description}</p>
                    )}
                  </div>
                  <form
                    action={deleteProductVariant.bind(null, product.id, v.id)}
                  >
                    <button className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {addVariantOpen && (
            <form
              action={handleAddVariant}
              className="mt-4 space-y-2 pt-4 border-t border-zinc-800"
            >
              <input
                name="name"
                required
                className="input w-full text-sm"
                placeholder="Variant name (e.g. Standard)"
              />
              <input
                name="description"
                className="input w-full text-sm"
                placeholder="Short description (optional)"
              />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm flex-1">
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setAddVariantOpen(false)}
                  className="btn-ghost text-sm flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Inclusions */}
        <div className="bg-[#1a1a18] rounded-xl border border-zinc-800 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">
              What&apos;s Included
            </h3>
            <button
              onClick={() => setAddInclusionOpen(true)}
              className="text-xs text-[var(--color-sunset)] hover:opacity-80"
            >
              + Add
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              ["included", "excluded", "requirement", "restriction"] as const
            ).map((type) => {
              const items = product.inclusions.filter(
                (i) => i.inclusion_type === type,
              );
              const labels: Record<string, string> = {
                included: "Included",
                excluded: "Not Included",
                requirement: "Requirements",
                restriction: "Restrictions",
              };
              return (
                <div key={type}>
                  <p
                    className={`text-xs font-medium mb-2 ${INCLUSION_COLORS[type]}`}
                  >
                    {labels[type]}
                  </p>
                  {items.length === 0 ? (
                    <p className="text-xs text-zinc-600">None</p>
                  ) : (
                    <ul className="space-y-1">
                      {items.map((inc) => (
                        <li
                          key={inc.id}
                          className="flex items-start gap-2 group"
                        >
                          <span
                            className={`text-xs mt-0.5 ${INCLUSION_COLORS[type]}`}
                          >
                            <Icon
                              name={INCLUSION_ICONS[type] as "checkCircle"}
                              className="w-3 h-3"
                            />
                          </span>
                          <span className="text-xs text-zinc-300 flex-1">
                            {inc.label}
                          </span>
                          <form
                            action={deleteProductInclusion.bind(
                              null,
                              product.id,
                              inc.id,
                            )}
                          >
                            <button className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                              <Icon name="x" className="w-3 h-3" />
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {addInclusionOpen && (
            <form
              action={handleAddInclusion}
              className="mt-5 pt-5 border-t border-zinc-800 flex flex-wrap gap-3 items-end"
            >
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-zinc-400 mb-1">
                  Label *
                </label>
                <input
                  name="label"
                  required
                  className="input w-full text-sm"
                  placeholder="e.g. Park fees included"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Type *
                </label>
                <select name="inclusion_type" className="input text-sm">
                  <option value="included">Included</option>
                  <option value="excluded">Not Included</option>
                  <option value="requirement">Requirement</option>
                  <option value="restriction">Restriction</option>
                </select>
              </div>
              <button type="submit" className="btn-primary text-sm">
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddInclusionOpen(false)}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
