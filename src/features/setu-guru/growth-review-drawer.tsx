'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared right-side review drawer for Growth Center (CRM Matches + External Discovery).
 * Keeps the interaction pattern consistent per the approved Growth Center wireframe (17.6):
 * no popup workflow, keyboard/focus safe, closes on Escape or backdrop click, never performs
 * any action automatically on open.
 */
export function GrowthReviewDrawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Close review drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface-1 shadow-panel motion-safe:animate-in motion-safe:slide-in-from-right focus:outline-none sm:max-w-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line p-4">
          <div className="min-w-0">
            {eyebrow ? <p className="text-caption font-medium uppercase tracking-wide text-brand-700">{eyebrow}</p> : null}
            <h2 className="mt-0.5 truncate text-base font-medium text-content-primary">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-ctl text-content-muted transition hover:bg-surface-2 hover:text-content-primary')}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 p-4">{children}</div>
      </div>
    </div>
  );
}

export function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <p className="text-caption font-medium uppercase tracking-wide text-content-muted">{title}</p>
      <div className="mt-1.5 text-sm text-content-secondary">{children}</div>
    </section>
  );
}
