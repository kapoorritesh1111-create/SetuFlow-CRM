function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />;
}

function SkeletonOrderCard() {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="h-4 w-72 max-w-full bg-slate-100" />
        </div>
        <SkeletonBlock className="h-8 w-28 rounded-full" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <SkeletonBlock className="h-20 bg-slate-100" />
        <SkeletonBlock className="h-20 bg-slate-100" />
        <SkeletonBlock className="h-20 bg-slate-100" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <SkeletonBlock className="h-8 w-24 rounded-full" />
        <SkeletonBlock className="h-8 w-28 rounded-full" />
        <SkeletonBlock className="h-8 w-20 rounded-full" />
      </div>
    </div>
  );
}

export default function OrdersLoading() {
  const stageLabels = [
    'Quote approved',
    'PI issued',
    'Payment',
    'Packing',
    'Freight',
    'Dispatch',
    'Documents',
    'Closeout',
  ];

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6" aria-busy="true" aria-label="Loading orders cockpit">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <SkeletonBlock className="h-3 w-36 rounded-full" />
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SkeletonBlock className="h-8 w-72" />
            <SkeletonBlock className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-100" />
          </div>
          <div className="flex flex-wrap gap-2">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-32" />
            <SkeletonBlock className="h-10 w-24" />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-8" aria-label="Loading order stages">
        {stageLabels.map((stage) => (
          <div key={stage} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <SkeletonBlock className="h-4 w-24 rounded-full" />
            <SkeletonBlock className="mt-3 h-7 w-12" />
            <SkeletonBlock className="mt-4 h-2 w-full rounded-full bg-slate-100" />
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm" aria-label="Loading orders filters">
          <SkeletonBlock className="h-5 w-32 rounded-full" />
          <div className="mt-4 space-y-3">
            {stageLabels.map((stage) => (
              <div key={stage} className="rounded-2xl bg-slate-50 p-3">
                <SkeletonBlock className="h-4 w-32 rounded-full" />
                <SkeletonBlock className="mt-2 h-3 w-20 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-3" aria-label="Loading order cards">
          <SkeletonOrderCard />
          <SkeletonOrderCard />
          <SkeletonOrderCard />
        </div>
      </section>
    </main>
  );
}
