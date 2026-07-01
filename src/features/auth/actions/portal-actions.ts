"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getAvailablePortals,
  PREFERRED_PORTAL_COOKIE,
  type PortalKey,
} from "@/features/auth/services/auth-routing";

const portalSchema = z.enum(["team", "agent", "customer", "admin"]);

export async function selectPortal(input: unknown) {
  const portal = portalSchema.parse(input) as PortalKey;
  const portals = await getAvailablePortals();
  const choice = portals.find((item) => item.key === portal);
  if (!choice) {
    throw new Error("That workspace is not available for your account.");
  }

  const cookieStore = await cookies();
  cookieStore.set(PREFERRED_PORTAL_COOKIE, portal, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  redirect(choice.href);
}
