'use client';

// Shared mobile primitives — built on the tokens in design-tokens.css.
// Consumers (MobileDashboardHome, role-aware-lead-list, MobileQuotesList,
// MobileOrdersWorkspace, MobileTasksWorkspace) compose these instead of
// hand-rolling raw Tailwind palette classes (bg-blue-50, bg-rose-50, etc.)
// per screen. See DESIGN-SYSTEM.md section 4 for the source spec.

import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// MetricTile — the 2-up/3-up grid tile used on Home, Quotes, Orders summaries.
// ---------------------------------------------------------------------------
export type MetricTone = 'stage-new' | 'danger' | 'brand' | 'stage-contacted' | 'accent' | 'warning' | 'success' | 'stage-sample';

const METRIC_TONE_CLASSES: Record<MetricTone, string> = {
  'stage-new': 'bg-stage-new-bg text-stage-new-fg',
  danger: 'bg-danger-bg text-danger-fg',
  brand: 'bg-brand-50 text-brand-700',
  'stage-contacted': 'bg-stage-contacted-bg text-stage-contacted-fg',
  accent: 'bg-accent-50 text-accent-700',
  warning: 'bg-warning-bg text-warning-fg',
  success: 'bg-success-bg text-success-fg',
  'stage-sample': 'bg-stage-sample-bg text-stage-sample-fg',
};

export function MetricTile({
  icon,
  value,
  label,
  sub,
  tone,
  href,
  small,
}: {
  icon?: ReactNode;
  value: string | number;
  label: string;
  sub?: string;
  tone: MetricTone;
  href?: string;
  small?: boolean;
}) {
  const content = (
    <div className={cn('rounded-card border border-line bg-surface-1 shadow-card', small ? 'p-3' : 'p-4')}>
      {icon ? (
        <div className={cn('mb-2.5 flex h-9 w-9 items-center justify-center rounded-[11px] text-base', METRIC_TONE_CLASSES[tone])}>
          {icon}
        </div>
      ) : null}
      <p className={cn('font-semibold tabular-nums tracking-tight text-content-primary', small ? 'text-lg' : 'text-[22px]')}>{value}</p>
      <p className="mt-1 text-[11.5px] font-semibold text-content-primary">{label}</p>
      {sub ? <p className="text-[10px] font-medium text-content-faint">{sub}</p> : null}
    </div>
  );
  if (!href) return content;
  return <a href={href} className="block active:scale-[.98] transition">{content}</a>;
}

export function MetricGrid({ children, columns = 2 }: { children: ReactNode; columns?: 2 | 3 }) {
  return <div className={cn('grid gap-2.5', columns === 3 ? 'grid-cols-3' : 'grid-cols-2')}>{children}</div>;
}

// ---------------------------------------------------------------------------
// StatusPill — always sourced from a semantic mapper, never a one-off hex.
// ---------------------------------------------------------------------------
export type PillTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'stage-new' | 'stage-contacted' | 'stage-qualified' | 'stage-sample' | 'stage-negotiation' | 'stage-won' | 'stage-lost';

const PILL_TONE_CLASSES: Record<PillTone, string> = {
  success: 'bg-success-bg text-success-fg border-success-border',
  warning: 'bg-warning-bg text-warning-fg border-warning-border',
  danger: 'bg-danger-bg text-danger-fg border-danger-border',
  info: 'bg-info-bg text-info-fg border-info-border',
  neutral: 'bg-surface-2 text-content-secondary border-line',
  'stage-new': 'bg-stage-new-bg text-stage-new-fg border-stage-new-border',
  'stage-contacted': 'bg-stage-contacted-bg text-stage-contacted-fg border-stage-contacted-border',
  'stage-qualified': 'bg-stage-qualified-bg text-stage-qualified-fg border-stage-qualified-border',
  'stage-sample': 'bg-stage-sample-bg text-stage-sample-fg border-stage-sample-border',
  'stage-negotiation': 'bg-stage-negotiation-bg text-stage-negotiation-fg border-stage-negotiation-border',
  'stage-won': 'bg-stage-won-bg text-stage-won-fg border-stage-won-border',
  'stage-lost': 'bg-stage-lost-bg text-stage-lost-fg border-stage-lost-border',
};

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]', PILL_TONE_CLASSES[tone])}>
      {children}
    </span>
  );
}

/** Solid hex for accent bars / icons where a Tailwind bg-* class isn't practical (e.g. dynamic inline style). */
export const PILL_TONE_SOLID_VAR: Record<PillTone, string> = {
  success: 'var(--sf-success-solid)',
  warning: 'var(--sf-warning-solid)',
  danger: 'var(--sf-danger-solid)',
  info: 'var(--sf-info-solid)',
  neutral: 'var(--sf-neutral-solid)',
  'stage-new': 'var(--sf-stage-new-solid)',
  'stage-contacted': 'var(--sf-stage-contacted-solid)',
  'stage-qualified': 'var(--sf-stage-qualified-solid)',
  'stage-sample': 'var(--sf-stage-sample-solid)',
  'stage-negotiation': 'var(--sf-stage-negotiation-solid)',
  'stage-won': 'var(--sf-stage-won-solid)',
  'stage-lost': 'var(--sf-stage-lost-solid)',
};

// ---------------------------------------------------------------------------
// ListCard — the one card shape used for a lead, a quote, an order, a task.
// Only the accent color + pill mapping change per domain.
// ---------------------------------------------------------------------------
export function ListCard({
  accentTone,
  title,
  meta,
  value,
  valueSub,
  pill,
  trailing,
  onClick,
  href,
  leading,
}: {
  accentTone: PillTone;
  title: ReactNode;
  meta?: ReactNode;
  value?: ReactNode;
  valueSub?: string;
  pill?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  leading?: ReactNode;
}) {
  const Wrapper = href ? 'a' : onClick ? 'button' : 'div';
  return (
    <Wrapper
      href={href}
      type={onClick && !href ? 'button' : undefined}
      onClick={onClick}
      className="mb-2.5 flex w-full gap-2.5 rounded-card border border-line bg-surface-1 p-3.5 text-left shadow-soft"
    >
      {leading ?? <span className="w-[3px] shrink-0 self-stretch rounded-full" style={{ background: PILL_TONE_SOLID_VAR[accentTone] }} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[13.5px] font-semibold text-content-primary">{title}</p>
          {value ? (
            <div className="shrink-0 text-right">
              <p className="text-[13px] font-semibold tabular-nums text-content-primary">{value}</p>
              {valueSub ? <p className="text-right text-[9px] font-semibold text-content-faint">{valueSub}</p> : null}
            </div>
          ) : null}
        </div>
        {meta ? <p className="mt-0.5 text-[11px] font-medium text-content-muted">{meta}</p> : null}
        {pill || trailing ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {pill}
            {trailing ? <span className="ml-auto">{trailing}</span> : null}
          </div>
        ) : null}
      </div>
    </Wrapper>
  );
}

// ---------------------------------------------------------------------------
// SegmentedControl — All/Buyer/Supplier, My tasks/Team/Overdue, etc.
// ---------------------------------------------------------------------------
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="mb-3.5 flex gap-0.5 rounded-ctl bg-surface-2 p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded-[9px] py-2 text-[12.5px] font-semibold transition',
            value === option.value ? 'bg-brand-700 text-white' : 'text-content-secondary',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchBar — shared across Leads, Quotes, Orders.
// ---------------------------------------------------------------------------
export function SearchBar({
  placeholder,
  value,
  onChange,
  onSort,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSort?: () => void;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 rounded-ctl border border-line bg-surface-1 px-3.5 py-2.5 shadow-soft">
      <span className="text-content-faint">⌕</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-content-primary outline-none placeholder:text-content-faint"
      />
      {onSort ? (
        <button type="button" onClick={onSort} aria-label="Sort" className="border-l border-line pl-2.5 text-[13px] text-content-muted">⇅</button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LeadRow — colored avatar, one meta line, status dot, inline Call/WhatsApp/
// Quote actions. Same shape for buyer and supplier rows; only the third
// action icon and its color change (Quote vs Nudge vs Approve cost).
// ---------------------------------------------------------------------------
const AVATAR_GRADIENTS = [
  'linear-gradient(145deg,#60A5FA,#2563EB)',
  'linear-gradient(145deg,#C084FC,#7E22CE)',
  'linear-gradient(145deg,#FBBF24,#B45309)',
  'linear-gradient(145deg,#34D399,#047857)',
  'linear-gradient(145deg,#FB7185,#BE123C)',
];

/** Deterministic gradient per id so the same lead always gets the same color. */
export function avatarGradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export function LeadRow({
  id,
  initials,
  name,
  meta,
  statusLabel,
  statusTone,
  thirdAction,
  onOpen,
  onCall,
  onWhatsApp,
}: {
  id: string;
  initials: string;
  name: string;
  meta: string;
  statusLabel: string;
  statusTone: PillTone;
  thirdAction: { icon: string; label: string; tone: PillTone; onClick: () => void };
  onOpen: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
}) {
  return (
    <div className="mb-2 flex gap-2.5 rounded-card border border-line bg-surface-1 p-3">
      <button type="button" onClick={onOpen} className="h-10 w-10 shrink-0 rounded-full text-[13px] font-bold text-white" style={{ background: avatarGradientFor(id) }}>
        {initials}
      </button>
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onOpen} className="flex w-full items-baseline justify-between gap-2 text-left">
          <span className="truncate text-[13.5px] font-semibold text-content-primary">{name}</span>
        </button>
        <p className="mt-0.5 truncate text-[11px] font-medium text-content-muted">{meta}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: `var(--sf-${statusTone}-fg)` }}>
            <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: PILL_TONE_SOLID_VAR[statusTone] }} />
            {statusLabel}
          </span>
          <div className="flex shrink-0 gap-1.5">
            {onCall ? <button type="button" onClick={onCall} aria-label="Call" className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-success-bg text-[12px]">📞</button> : null}
            {onWhatsApp ? <button type="button" onClick={onWhatsApp} aria-label="WhatsApp" className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-stage-won-bg text-[12px]">💬</button> : null}
            <button type="button" onClick={thirdAction.onClick} aria-label={thirdAction.label} title={thirdAction.label} className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] text-[12px] text-white" style={{ background: PILL_TONE_SOLID_VAR[thirdAction.tone] }}>
              {thirdAction.icon}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonthDivider({ label }: { label: string }) {
  return <p className="mb-2 mt-3.5 text-center text-[11px] font-semibold text-content-faint">{label}</p>;
}

// ---------------------------------------------------------------------------
// SwipeRow — reveals a left/right action on drag, snaps back after firing.
// Built on vanilla touch events; no gesture library dependency. Used to wrap
// ListCard/LeadRow-style rows on Leads, Quotes, Orders, Tasks.
// ---------------------------------------------------------------------------
export function SwipeRow({
  children,
  leftAction,
  rightAction,
  onSwipeLeft,
  onSwipeRight,
  threshold = 64,
}: {
  children: ReactNode;
  leftAction?: { label: string; tone: PillTone };
  rightAction?: { label: string; tone: PillTone };
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const start = useRef(0);
  const dragging = useRef(false);

  function setX(x: number) {
    if (rowRef.current) rowRef.current.style.transform = `translateX(${x}px)`;
  }

  function onStart(clientX: number) {
    dragging.current = true;
    start.current = clientX;
    if (rowRef.current) rowRef.current.style.transition = 'none';
  }
  function onMove(clientX: number) {
    if (!dragging.current) return;
    const dx = clientX - start.current;
    const clamped = Math.max(-96, Math.min(96, dx));
    if ((clamped > 0 && !onSwipeRight) || (clamped < 0 && !onSwipeLeft)) return;
    setX(clamped);
  }
  function onEnd(clientX: number) {
    if (!dragging.current) return;
    dragging.current = false;
    const dx = clientX - start.current;
    if (rowRef.current) rowRef.current.style.transition = 'transform .25s cubic-bezier(.2,0,0,1)';
    if (dx > threshold && onSwipeRight) onSwipeRight();
    else if (dx < -threshold && onSwipeLeft) onSwipeLeft();
    setX(0);
  }

  return (
    <div className="relative mb-2 overflow-hidden rounded-card">
      {leftAction || rightAction ? (
        <div className="absolute inset-0 flex items-stretch justify-between">
          {rightAction ? (
            <div className="flex items-center gap-1.5 px-4 text-[11px] font-semibold text-white" style={{ background: PILL_TONE_SOLID_VAR[rightAction.tone] }}>{rightAction.label}</div>
          ) : <div />}
          {leftAction ? (
            <div className="ml-auto flex items-center gap-1.5 px-4 text-[11px] font-semibold text-white" style={{ background: PILL_TONE_SOLID_VAR[leftAction.tone] }}>{leftAction.label}</div>
          ) : null}
        </div>
      ) : null}
      <div
        ref={rowRef}
        className="relative"
        onTouchStart={(e) => onStart(e.touches[0].clientX)}
        onTouchMove={(e) => onMove(e.touches[0].clientX)}
        onTouchEnd={(e) => onEnd(e.changedTouches[0].clientX)}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PullToRefresh — wraps a scrollable list; pulling down past threshold at
// scrollTop===0 triggers onRefresh. Vanilla touch events, no dependency.
// ---------------------------------------------------------------------------
export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => Promise<void> | void }) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const start = useRef(0);
  const pulling = useRef(false);
  const [refreshing, setRefreshing] = useState(false);

  function onStart(clientY: number) {
    // These screens scroll at the document level (no nested overflow-y-auto
    // container), so "at top" means window.scrollY, not a div's scrollTop.
    if (window.scrollY <= 0) {
      start.current = clientY;
      pulling.current = true;
    }
  }
  function onMove(clientY: number) {
    if (!pulling.current || !indicatorRef.current) return;
    const dy = clientY - start.current;
    if (dy > 0) indicatorRef.current.style.transform = `translateY(${Math.min(60, dy * 0.5)}px)`;
  }
  async function onEnd() {
    if (!pulling.current || !indicatorRef.current) return;
    pulling.current = false;
    const t = indicatorRef.current.style.transform;
    const dist = t ? parseFloat(t.replace(/[^\d.]/g, '')) : 0;
    if (dist > 40) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    indicatorRef.current.style.transform = 'translateY(0)';
  }

  return (
    <div
      className="relative"
      onTouchStart={(e) => onStart(e.touches[0].clientY)}
      onTouchMove={(e) => onMove(e.touches[0].clientY)}
      onTouchEnd={onEnd}
    >
      <div ref={indicatorRef} className="pointer-events-none absolute inset-x-0 -top-9 flex h-9 items-center justify-center text-[11px] font-semibold text-content-muted transition-transform">
        {refreshing ? 'Refreshing…' : 'Pull to refresh'}
      </div>
      {children}
    </div>
  );
}
