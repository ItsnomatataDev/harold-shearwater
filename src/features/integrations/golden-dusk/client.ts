import "server-only";

import type { GoldenDuskApiResponse } from "./types";

const DEFAULT_BASE_URL = "https://swagoldendusk.xyz/api";

export class GoldenDuskApiError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "GoldenDuskApiError";
    this.status = status;
    this.url = url;
  }
}

export function getGoldenDuskApiBaseUrl(): string {
  const configured = process.env.GOLDEN_DUSK_API_BASE_URL?.trim();
  return (configured || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export async function goldenDuskFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<GoldenDuskApiResponse<T>> {
  const baseUrl = getGoldenDuskApiBaseUrl();
  const url = path.startsWith("http")
    ? path
    : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new GoldenDuskApiError(
      `GoldenDusk request failed (${response.status})`,
      response.status,
      url,
    );
  }

  const payload = (await response.json()) as GoldenDuskApiResponse<T>;
  if (!payload.isSuccess) {
    throw new GoldenDuskApiError(
      payload.message || "GoldenDusk request returned isSuccess=false",
      response.status,
      url,
    );
  }

  return payload;
}
