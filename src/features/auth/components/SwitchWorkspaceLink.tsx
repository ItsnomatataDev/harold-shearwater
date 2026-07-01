import Link from "next/link";
import { Icon } from "@/components/Icon";

export function SwitchWorkspaceLink({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/select-access"
      className={
        compact
          ? "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[#a5a59f] transition hover:bg-white/5 hover:text-white"
          : "inline-flex items-center gap-2 text-xs text-[#a5a59f] transition hover:text-white"
      }
    >
      <Icon name="route" className="h-3.5 w-3.5" />
      Switch workspace
    </Link>
  );
}
