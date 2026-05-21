export default function OrdersLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200" />
        <div className="mt-4 h-8 w-72 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-slate-100" />
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-3 h-7 w-16 animate-pulse rounded-xl bg-slate-200" />
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-5 w-48 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-4 w-72 animate-pulse rounded-full bg-slate-100" />
                </div>
                <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200" />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
