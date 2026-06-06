'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string;
  headerActions?: React.ReactNode;
  bodyClassName?: string;
  hideHeader?: boolean;
}

type DrawerSectionProps = {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

type DrawerActionBarProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function DrawerSection({ title, description, action, children, className = '' }: DrawerSectionProps) {
  return (
    <section className={['rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-soft ring-1 ring-slate-950/5 backdrop-blur', className].join(' ')}>
      {title || description || action ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title ? <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</h3> : null}
            {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function DrawerActionBar({ title, description, children, className = '' }: DrawerActionBarProps) {
  return (
    <div className={['flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className].join(' ')}>
      {title || description ? (
        <div className="min-w-0 flex-1">
          {title ? <div className="text-sm font-semibold text-slate-900">{title}</div> : null}
          {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{children}</div>
    </div>
  );
}

const RightDrawer: React.FC<RightDrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = 'sm:max-w-xl lg:max-w-2xl',
  headerActions,
  bodyClassName = '',
  hideHeader = false,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.classList.add('drawer-open');

    const focusFirst = window.setTimeout(() => {
      const panel = panelRef.current;
      const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((node) => !node.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      const touch = e.touches[0];
      if (panel.contains(e.target as Node)) {
        touchStartXRef.current = touch.clientX;
        touchStartYRef.current = touch.clientY;
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartXRef.current === null || touchStartYRef.current === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartXRef.current;
      const dy = Math.abs(touch.clientY - touchStartYRef.current);
      if (dx > 80 && dy < 60) {
        onClose();
      }
      touchStartXRef.current = null;
      touchStartYRef.current = null;
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.clearTimeout(focusFirst);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.classList.remove('drawer-open');
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const drawer = (
    <div className="fixed inset-0 z-[920] flex justify-end" role="presentation">
      <button type="button" className="flex-1 bg-slate-950/55 transition-opacity duration-200" onClick={onClose} aria-label="Close drawer" />
      <div
        ref={panelRef}
        className={[
          'flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-l border-white/60 bg-white shadow-2xl',
          'sm:my-3 sm:mr-3 sm:h-[calc(100dvh-1.5rem)] sm:rounded-[2rem] sm:ring-1 sm:ring-slate-950/8',
          widthClassName,
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
      >
        {!hideHeader ? (
          <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {title ? <h2 id={titleId} className="truncate text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2> : null}
                {description ? <p id={descriptionId} className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p> : null}
                {headerActions ? <div className="mt-3">{headerActions}</div> : null}
              </div>
              <button type="button" onClick={onClose} aria-label="Close drawer" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><span aria-hidden="true">X</span></button>
            </div>
          </div>
        ) : null}
        <div className={['flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5', bodyClassName].join(' ')}>{children}</div>
        {footer ? <div className="sticky bottom-0 z-20 border-t border-slate-200/80 bg-white px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-20px_50px_rgba(15,23,42,.12)] sm:px-5 sm:pb-4">{footer}</div> : null}
      </div>
    </div>
  );

  return createPortal(drawer, document.body);
};

export default RightDrawer;
