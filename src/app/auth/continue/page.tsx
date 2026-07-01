import { redirect } from "next/navigation";
import { resolvePostAuthDestination } from "@/features/auth/services/auth-routing";

export default async function ContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(await resolvePostAuthDestination(next));
}
