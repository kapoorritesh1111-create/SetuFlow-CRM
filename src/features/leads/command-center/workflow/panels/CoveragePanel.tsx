import type { LeadProfileSnapshot } from '../../types'
import { getActionIcon, getWorkflowIcon, ICON_CONTAINER_CLASS } from '../../ui-system'

function CoverageTag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone === 'accent' ? 'bg-status-ready/10 text-status-ready' : 'bg-neutral-50 text-neutral-600'}`}>{label}</span>
}

export function CoveragePanel({
  mapping,
  onEditCoverage,
}: {
  mapping: LeadProfileSnapshot['mapping']
  onEditCoverage: () => void
}) {
  const CoverageIcon = getWorkflowIcon('coverage')
  const OpenIcon = getActionIcon('open')

  return (
    <section className="premium-surface rounded-[12px] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className={ICON_CONTAINER_CLASS}><CoverageIcon className="h-4 w-4 text-neutral-600" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-600">Coverage manager</p>
              <h3 className="mt-1 text-xl font-semibold text-neutral-900">Edit mapped products and market context</h3>
            </div>
          </div>
          <p className="mt-3 text-sm leading-7 text-neutral-600">Keep product coverage clean before quote work starts. Products define the commercial lane, while markets add operator context when trade fit matters.</p>
        </div>
        <button type="button" onClick={onEditCoverage} className="inline-flex items-center gap-2 rounded-[8px] bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark">
          <span className={ICON_CONTAINER_CLASS}><OpenIcon className="h-4 w-4 text-neutral-900" /></span>
          Open coverage manager
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[10px] bg-neutral-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Products in coverage</p>
            <CoverageTag label={`${mapping.productCount} mapped`} tone="accent" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mapping.productNames.length ? mapping.productNames.map((name) => <CoverageTag key={name} label={name} />) : <p className="text-sm text-neutral-500">No mapped products yet.</p>}
          </div>
        </div>
        <div className="rounded-[10px] bg-neutral-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-600">Markets in context</p>
            <CoverageTag label={`${mapping.marketCount} linked`} tone={mapping.marketCount > 0 ? 'accent' : 'neutral'} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mapping.marketNames.length ? mapping.marketNames.map((name) => <CoverageTag key={name} label={name} />) : <p className="text-sm text-neutral-500">Markets are optional and can stay empty.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}
