import Link from 'next/link';

const actions = [
  { title: 'Catalog gaps', href: '/products?gap=has_gap', label: 'Open gaps' },
  { title: 'Quote-ready', href: '/products?quoteable=quoteable', label: 'Open ready' },
  { title: 'Product setup', href: '/products?mode=products', label: 'Open setup' },
  { title: 'Pricing coverage', href: '/products?mode=pricing&gap=has_gap', label: 'Open pricing' },
];

export function ProductsWorkspaceActionMap() {
  return (
    <section className="rounded-panel border border-blue-100 bg-blue-50/70 p-4 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/25">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-sky-200">Catalog shortcuts</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">Products workspace</h2>
        </div>
        <Link href="/admin/product-management" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 dark:bg-slate-950 dark:text-sky-100 dark:ring-sky-900/60">
          Product Management
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <Link key={action.title} href={action.href} className="group rounded-2xl bg-white p-3 shadow-sm ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950/80 dark:ring-sky-900/60">
            <p className="font-semibold text-slate-950 dark:text-slate-50">{action.title}</p>
            <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100 group-hover:bg-blue-100 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-900/60">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
