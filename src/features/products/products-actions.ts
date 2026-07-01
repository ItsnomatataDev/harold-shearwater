"use server";

import { CATALOG_API_ONLY_MESSAGE } from "@/features/products/catalog-policy";

export type ProductFormState = {
  error?: string;
  success?: boolean;
  productId?: string;
};

function blockCatalogUiWrite() {
  return { error: CATALOG_API_ONLY_MESSAGE };
}

function blockCatalogUiWriteThrow() {
  throw new Error(CATALOG_API_ONLY_MESSAGE);
}

export async function addProduct(
  _prev: ProductFormState,
  _formData: FormData,
): Promise<ProductFormState> {
  return blockCatalogUiWrite();
}

export async function updateProduct(
  _productId: string,
  _prev: ProductFormState,
  _formData: FormData,
): Promise<ProductFormState> {
  return blockCatalogUiWrite();
}

export async function setProductStatus(
  _productId: string,
  _status: "draft" | "active" | "archived",
): Promise<void> {
  blockCatalogUiWriteThrow();
}

export async function addProductVariant(
  _productId: string,
  _formData: FormData,
): Promise<{ error?: string }> {
  return blockCatalogUiWrite();
}

export async function deleteProductVariant(
  _productId: string,
  _variantId: string,
): Promise<void> {
  blockCatalogUiWriteThrow();
}

export async function addProductInclusion(
  _productId: string,
  _formData: FormData,
): Promise<{ error?: string }> {
  return blockCatalogUiWrite();
}

export async function deleteProductInclusion(
  _productId: string,
  _inclusionId: string,
): Promise<void> {
  blockCatalogUiWriteThrow();
}
