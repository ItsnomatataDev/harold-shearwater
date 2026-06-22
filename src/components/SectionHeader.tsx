import { Icon } from './Icon'

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <div className="flex items-center justify-between"><h2 className="text-[15px] font-semibold text-[#f2f2ed]">{title}</h2>{action && <button className="flex items-center gap-1 text-xs font-medium text-[#a8a8a1] transition hover:text-white">{action}<Icon name="chevron" className="h-3.5 w-3.5" /></button>}</div>
}
