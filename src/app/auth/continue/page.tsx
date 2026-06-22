import { redirect } from "next/navigation";
import {
  getAccessHomePath,
  getAuthContext,
} from "@/features/auth/services/auth-context";

export default async function ContinuePage() {
  const context = await getAuthContext();
  if (!context) redirect("/auth");
  if (context.memberships.length > 1) redirect("/select-access");
  const membership = context.memberships[0];
  if (!membership) redirect("/access-pending");
  redirect(getAccessHomePath(membership.accessType));
}
