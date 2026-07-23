import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

// Feedback triads (DESIGN-SYSTEM.md 3.1) — bg/fg/border tokens, never
// restyled per page. Chips and banners use these; icons/charts use *-solid.
export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'border-line bg-surface-2 text-content-secondary',
  success: 'border-success-border bg-success-bg text-success-fg',
  warning: 'border-warning-border bg-warning-bg text-warning-fg',
  danger: 'border-danger-border bg-danger-bg text-danger-fg',
  info: 'border-info-border bg-info-bg text-info-fg',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  className,
  dot = true,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption uppercase shadow-soft',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );
}

/** Generic ticket/task-style status strings -> feedback tone. */
export function getStatusTone(status: string): StatusTone {
  const value = status.trim().toLowerCase();
  if (['done', 'complete', 'won', 'qualified', 'active', 'in progress', 'ready'].includes(value)) return 'success';
  if (['warning', 'waiting', 'next'].includes(value)) return 'warning';
  if (['at risk', 'blocked', 'lost', 'danger'].includes(value)) return 'danger';
  if (['new', 'info', 'review'].includes(value)) return 'info';
  return 'neutral';
}

/**
 * Quote lifecycle -> feedback tone (DESIGN-SYSTEM.md 3.2).
 * draft -> neutral, pending approval -> warning, approved -> info,
 * sent -> info (contacted-indigo family reads closest as info here since
 * StatusBadge only carries the 5 feedback tones — full stage-indigo
 * treatment belongs to StageChip), negotiation -> warning, accepted ->
 * success, rejected/expired -> danger/neutral. Always map through this
 * function — never restyle a quote status per page.
 */
export function getQuoteTone(status: string): StatusTone {
  const value = status.trim().toLowerCase().replace(/[_-]/g, ' ');
  switch (value) {
    case 'draft':
      return 'neutral';
    case 'pending approval':
    case 'pending':
    case 'in review':
      return 'warning';
    case 'approved':
      return 'info';
    case 'sent':
      return 'info';
    case 'negotiation':
    case 'countered':
      return 'warning';
    case 'accepted':
    case 'converted':
      return 'success';
    case 'rejected':
    case 'declined':
      return 'danger';
    case 'expired':
    case 'superseded':
    case 'archived':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Compliance / document readiness -> feedback tone (DESIGN-SYSTEM.md 3.2).
 * ready -> success, in progress -> warning, blocked -> danger,
 * expired/cold -> neutral.
 */
export function getComplianceTone(status: string): StatusTone {
  const value = status.trim().toLowerCase().replace(/[_-]/g, ' ');
  switch (value) {
    case 'ready':
    case 'complete':
    case 'verified':
      return 'success';
    case 'in progress':
    case 'progress':
    case 'pending':
      return 'warning';
    case 'blocked':
    case 'missing':
    case 'rejected':
      return 'danger';
    case 'expired':
    case 'cold':
      return 'neutral';
    default:
      return 'neutral';
  }
}
