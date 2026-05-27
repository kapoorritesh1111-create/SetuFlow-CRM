// SF-19-015: Skeleton loading components
import { cn } from '@/lib/utils';

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('skeleton-shimmer h-4 w-full', className)} aria-hidden="true" />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white p-4', className)} aria-hidden="true">
      <div className="flex items-start gap-3">
        <div className="skeleton-shimmer h-10 w-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-3/4 h-4" />
          <SkeletonLine className="w-1/2 h-3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <SkeletonLine className="h-3" />
        <SkeletonLine className="h-3 w-5/6" />
        <SkeletonLine className="h-3 w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3', className)} aria-hidden="true">
      <div className="skeleton-shimmer h-8 w-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine className="w-2/5 h-3.5" />
        <SkeletonLine className="w-1/4 h-2.5" />
      </div>
      <SkeletonLine className="w-16 h-6 rounded-full" />
    </div>
  );
}

export function SkeletonList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-label="Loading…" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonWorkspace({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-6 p-4', className)} aria-label="Loading workspace…" aria-busy="true">
      {/* Header */}
      <div className="space-y-2">
        <SkeletonLine className="w-1/3 h-7" />
        <SkeletonLine className="w-2/5 h-4" />
      </div>
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton-shimmer h-20 rounded-2xl" />
        ))}
      </div>
      {/* List */}
      <SkeletonList count={5} />
    </div>
  );
}
