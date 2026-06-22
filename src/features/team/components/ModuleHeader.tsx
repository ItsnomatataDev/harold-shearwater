import type { ReactNode } from "react";

export function ModuleHeader({
  eyebrow = "Team Access",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:flex-row sm:items-end sm:justify-between sm:p-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-sunset">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function ModuleEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#3b3b38] bg-[#1a1a18] px-6 py-12 text-center">
      <p className="text-sm font-semibold text-[#d7d7d0]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#777771]">
        {description}
      </p>
    </div>
  );
}
