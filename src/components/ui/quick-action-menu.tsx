import Link from 'next/link';
import { cn } from '@/lib/utils';

export type QuickActionItem = {
  label: string;
  shortLabel?: string;
  href?: string;
  emphasis?: 'default' | 'primary';
};

export function QuickActionMenu({ items, className }: { items: QuickActionItem[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => {
        const content = (
          <>
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
          </>
        );
        const classes = item.emphasis === 'primary'
          ? 'border-transparent bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] text-white shadow-[0_12px_26px_rgba(31,72,124,0.16)]'
          : 'border-slate-200 bg-white text-slate-700';

        if (item.href) {
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={cn('inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition hover:-translate-y-0.5', classes)}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={item.label}
            type="button"
            className={cn('inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition hover:-translate-y-0.5', classes)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
