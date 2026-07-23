import { cn } from '@/lib/utils';

export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'sample'
  | 'negotiation'
  | 'won'
  | 'lost';

// Fixed chip triads (DESIGN-SYSTEM.md 3.2) — the single source of truth
// for pipeline-stage color, shared by the kanban board, lead cards, and
// any stage-split chart legend. Never restyle a stage per page.
const STAGE_CHIP_CLASSES: Record<PipelineStage, string> = {
  new: 'border-stage-new-border bg-stage-new-bg text-stage-new-fg',
  contacted: 'border-stage-contacted-border bg-stage-contacted-bg text-stage-contacted-fg',
  qualified: 'border-stage-qualified-border bg-stage-qualified-bg text-stage-qualified-fg',
  sample: 'border-stage-sample-border bg-stage-sample-bg text-stage-sample-fg',
  negotiation: 'border-stage-negotiation-border bg-stage-negotiation-bg text-stage-negotiation-fg',
  won: 'border-stage-won-border bg-stage-won-bg text-stage-won-fg',
  lost: 'border-stage-lost-border bg-stage-lost-bg text-stage-lost-fg',
};

const STAGE_SOLID_CLASSES: Record<PipelineStage, string> = {
  new: 'bg-stage-new-solid',
  contacted: 'bg-stage-contacted-solid',
  qualified: 'bg-stage-qualified-solid',
  sample: 'bg-stage-sample-solid',
  negotiation: 'bg-stage-negotiation-solid',
  won: 'bg-stage-won-solid',
  lost: 'bg-stage-lost-solid',
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  sample: 'Sample',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

/** Best-effort mapper from a free-text stage name to a PipelineStage key. */
export function getStageKey(name: string): PipelineStage {
  const value = name.trim().toLowerCase();
  if (value.includes('qualif')) return 'qualified';
  if (value.includes('sample')) return 'sample';
  if (value.includes('negotiat')) return 'negotiation';
  if (value.includes('won')) return 'won';
  if (value.includes('lost')) return 'lost';
  if (value.includes('contact')) return 'contacted';
  return 'new';
}

export function StageChip({
  stage,
  label,
  count,
  solid = false,
  className,
}: {
  stage: PipelineStage;
  label?: string;
  count?: number;
  /** Use the solid fill (kanban column headers) instead of the bg/fg/border chip. */
  solid?: boolean;
  className?: string;
}) {
  if (solid) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption uppercase text-white',
          STAGE_SOLID_CLASSES[stage],
          className,
        )}
      >
        {label ?? STAGE_LABELS[stage]}
        {typeof count === 'number' ? <span className="opacity-80">· {count}</span> : null}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption uppercase',
        STAGE_CHIP_CLASSES[stage],
        className,
      )}
    >
      {label ?? STAGE_LABELS[stage]}
      {typeof count === 'number' ? <span className="opacity-70">· {count}</span> : null}
    </span>
  );
}
