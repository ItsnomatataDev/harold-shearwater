import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  actionHref?: string;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  actionHref,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-[15px] font-semibold text-[#f2f2ed]">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs text-[#777771]">{subtitle}</p>
        ) : null}
      </div>
      {action ? (
        actionHref ? (
          <Link
            href={actionHref}
            className="flex items-center gap-1 text-xs font-medium text-[#a8a8a1] transition hover:text-white"
          >
            {action}
            <Icon name="chevron" className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-[#777771]">
            {action}
          </span>
        )
      ) : null}
    </div>
  );
}

export default SectionHeader;
