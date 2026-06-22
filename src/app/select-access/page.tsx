import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getAccessHomePath,
  getAuthContext,
} from "@/features/auth/services/auth-context";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

export default async function SelectAccessPage() {
  const context = await getAuthContext();
  if (!context) redirect("/auth");
  return (
    <main className="min-h-screen bg-[#111] px-6 py-16">
      <section className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-sunset">
          Choose a workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          Where are you working today?
        </h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {context.memberships.map((membership) => (
            <Link
              key={membership.id}
              href={getAccessHomePath(membership.accessType)}
              className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-5 transition hover:border-[#50504a]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-victoria">
                {membership.accessType} access
              </p>
              <h2 className="mt-3 text-base font-semibold text-white">
                {membership.organizationName || "Personal workspace"}
              </h2>
              <p className="mt-2 text-xs text-[#7d7d77]">Open workspace</p>
            </Link>
          ))}
        </div>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
