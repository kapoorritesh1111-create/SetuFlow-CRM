import type { LeadCommandCenterTabKey } from './types'
import { ICON_CONTAINER_CLASS, getActionIcon, getTabIcon } from './ui-system'

function TabChip({
  active,
  label,
  onClick,
  Icon,
}: {
  active: boolean
  label: string
  onClick: () => void
  Icon: ReturnType<typeof getTabIcon>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active
        ? 'inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-3.5 text-sm font-semibold text-white shadow-soft'
        : 'inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700'}
    >
      <span className={ICON_CONTAINER_CLASS}><Icon className="h-4 w-4 text-slate-600" /></span>
      {label}
    </button>
  )
}

export function LeadStickyActionBar({
  tabs,
  activeTab,
  hasActiveQuote,
  quoteBusy,
  onSelectTab,
  onOpenQuote,
  onQuickEdit,
  onOpenFollowUp,
}: {
  tabs: Array<{ key: LeadCommandCenterTabKey; label: string }>
  activeTab: LeadCommandCenterTabKey
  hasActiveQuote: boolean
  quoteBusy?: boolean
  onSelectTab: (tab: LeadCommandCenterTabKey) => void
  onOpenQuote: () => void
  onQuickEdit: () => void
  onOpenFollowUp: () => void
}) {
  const QuoteIcon = getActionIcon('open')
  const NoteIcon = getActionIcon('add_note')
  const FollowUpIcon = getActionIcon('follow_up')

  return (
    <section className="sticky bottom-3 z-30 rounded-[16px] border border-slate-200/80 bg-white/95 px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <TabChip
              key={tab.key}
              active={activeTab === tab.key}
              label={tab.label}
              onClick={() => onSelectTab(tab.key)}
              Icon={getTabIcon(tab.key)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onQuickEdit} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <span className={ICON_CONTAINER_CLASS}><NoteIcon className="h-4 w-4 text-slate-600" /></span>
            Quick edit
          </button>
          <button type="button" onClick={onOpenFollowUp} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
            <span className={ICON_CONTAINER_CLASS}><FollowUpIcon className="h-4 w-4 text-slate-600" /></span>
            Follow-up action
          </button>
          <button type="button" onClick={onOpenQuote} disabled={quoteBusy} className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-60">
            <span className={ICON_CONTAINER_CLASS}><QuoteIcon className="h-4 w-4 text-neutral-900" /></span>
            {quoteBusy ? 'Opening quote…' : hasActiveQuote ? 'Review quote' : 'Create quote'}
          </button>
        </div>
      </div>
    </section>
  )
}
