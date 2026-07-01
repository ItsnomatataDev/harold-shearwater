import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/components/AuthForm";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next } = await searchParams;
  if (next?.startsWith("/auth/accept-invitation")) {
    redirect(next);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <section className="flex items-center justify-center bg-[#151514] px-6 py-12">
        <Suspense>
          <AuthForm />
        </Suspense>
      </section>
      <section className="relative hidden overflow-hidden border-l border-[#292927] bg-[#111] p-12 lg:flex lg:flex-col lg:justify-end">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-victoria/10 blur-3xl" />
        <div className="absolute bottom-28 left-16 h-64 w-64 rounded-full bg-gold/8 blur-3xl" />
        <div className="relative max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[.17em] text-victoria">
            The digital headquarters
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-.04em] text-[#f4f4ef]">
            One Shearwater platform.
            <br />
            The right access for every journey.
          </h2>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: "Team Access", note: "Invite only" },
              { label: "Agent Access", note: "Sign up & approve" },
              { label: "Customer Access", note: "Guest sign up" },
            ].map((item, index) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#343431] bg-[#1d1d1b]/80 p-4"
              >
                <span
                  className={`mb-5 block h-1.5 w-8 rounded-full ${index === 0 ? "bg-sunset" : index === 1 ? "bg-gold" : "bg-savannah"}`}
                />
                <p className="text-xs font-semibold text-[#d7d7d0]">
                  {item.label}
                </p>
                <p className="mt-1 text-[10px] text-[#666660]">{item.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-xs leading-5 text-[#73736d]">
            Guests and travel agents choose their account type at sign-up. Team
            members join through an invitation link from their administrator.
          </p>
        </div>
      </section>
    </main>
  );
}
