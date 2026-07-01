"use server";

import { CATALOG_API_ONLY_MESSAGE } from "@/features/products/catalog-policy";

export type RatePlanFormState = {
  error?: string;
  success?: boolean;
  planId?: string;
};

function blockCatalogUiWrite() {
  return { error: CATALOG_API_ONLY_MESSAGE };
}

function blockCatalogUiWriteThrow() {
  throw new Error(CATALOG_API_ONLY_MESSAGE);
}

export async function addRatePlan(
  _prev: RatePlanFormState,
  _formData: FormData,
): Promise<RatePlanFormState> {
  return blockCatalogUiWrite();
}

export async function updateRatePlan(
  _planId: string,
  _prev: RatePlanFormState,
  _formData: FormData,
): Promise<RatePlanFormState> {
  return blockCatalogUiWrite();
}

export async function toggleRatePlanActive(
  _planId: string,
  _active: boolean,
): Promise<void> {
  blockCatalogUiWriteThrow();
}

export async function addRatePlanItem(
  _planId: string,
  _formData: FormData,
): Promise<{ error?: string }> {
  return blockCatalogUiWrite();
}

export async function deleteRatePlanItem(
  _planId: string,
  _itemId: string,
): Promise<void> {
  blockCatalogUiWriteThrow();
}

export async function assignRatePlanToAgency(
  _ratePlanId: string,
  _membershipId: string,
): Promise<{ error?: string }> {
  return blockCatalogUiWrite();
}

export async function removeRatePlanAssignment(
  _assignmentId: string,
): Promise<{ error?: string }> {
  return blockCatalogUiWrite();
}
