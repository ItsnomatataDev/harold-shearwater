import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";

export type CustomerProfileSummary = {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  timezone?: string | null;
};

export function CustomerPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-savannah">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#a7a79f]">
            {description}
          </p>
        </div>
        {action}
      </div>
    </section>
  );
}

export function CustomerStatusCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: IconName;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2f2f2b] bg-[#191916] p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-savannah/10 text-savannah">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-[.14em] text-[#77776f]">
            {label}
          </p>
          <p className="mt-1 text-lg font-semibold text-white">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#96968e]">{detail}</p>
    </div>
  );
}

export function CustomerActionCard({
  href,
  icon,
  title,
  description,
  cta = "Open",
}: {
  href: string;
  icon: IconName;
  title: string;
  description: string;
  cta?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[#2f2f2b] bg-[#181816] p-5 transition hover:border-savannah/50 hover:bg-[#20201d]"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-savannah transition group-hover:bg-savannah/10">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-base font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#9b9b94]">{description}</p>
      <p className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-savannah">
        {cta}
        <Icon name="arrow" className="h-3.5 w-3.5" />
      </p>
    </Link>
  );
}

export function ApiPendingPanel({
  title,
  description,
  points,
}: {
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <section className="rounded-3xl border border-victoria/20 bg-victoria/5 p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-victoria/10 text-victoria">
          <Icon name="shield" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a7b7bd]">
            {description}
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-[#c8d8df] sm:grid-cols-2">
            {points.map((point) => (
              <li key={point} className="flex gap-2">
                <Icon
                  name="checkCircle"
                  className="mt-0.5 h-4 w-4 shrink-0 text-victoria"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#3a3a35] bg-[#181816] p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-savannah">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#9b9b94]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
