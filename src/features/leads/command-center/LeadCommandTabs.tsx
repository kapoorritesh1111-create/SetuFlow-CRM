import type { LeadCommandCenterTabKey } from './types'
import { getTabIcon, ICON_CONTAINER_CLASS } from './ui-system'

export function LeadCommandTabs({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: Array<{ key: LeadCommandCenterTabKey; label: string }>
  activeTab: LeadCommandCenterTabKey
  onSelect: (tab: LeadCommandCenterTabKey) => void
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => {
        const active = tab.key === activeTab
        const TabIcon = getTabIcon(tab.key)
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={active
              ? 'inline-flex h-10 items-center gap-2 rounded-full bg-brand-primary px-3.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(59,130,246,0.20)]'
              : 'inline-flex h-10 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900'}
          >
            <span className={ICON_CONTAINER_CLASS}>
              <TabIcon className={`h-4 w-4 ${active ? 'text-brand-primary' : 'text-neutral-600'}`} />
            </span>
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
