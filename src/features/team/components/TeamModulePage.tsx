import type { ReactNode } from "react";
import Link from "next/link";

export function TeamModulePage({
  eyebrow,
  title,
  description,
  children,
  nextSteps,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  nextSteps: string[];
}) {
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-sunset">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          {description}
        </p>
      </header>

      {children}

      <section className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-white">Build checklist</h2>
          <Link
            href="/team/basecamp"
            className="text-xs font-semibold uppercase tracking-[.14em] text-victoria hover:text-[#6dc6e5]"
          >
            Back to basecamp
          </Link>
        </div>
        <ol className="mt-4 space-y-2">
          {nextSteps.map((step, index) => (
            <li
              key={`${title}-${index}`}
              className="rounded-xl border border-[#2f2f2c] bg-[#222220] px-4 py-3 text-sm text-[#c8c8c2]"
            >
              <span className="mr-2 text-[#8c8c85]">{index + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
