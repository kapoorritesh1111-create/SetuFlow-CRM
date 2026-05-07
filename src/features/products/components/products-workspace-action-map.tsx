import Link from 'next/link';

const actions = [
  {
    title: 'Fix catalog gaps',
    body: 'Review missing HSN, pack, MOQ, origin, shelf life, lead time, category, and product-pricing assumptions before quoting.',
    href: '/products?gap=has_gap',
    label: 'Open gap view',
  },
  {
    title: 'Review quote-ready products',
    body: 'Use this when sales needs products that are active, quoteable, and priced enough for quote workflows.',
    href: '/products?quoteable=quoteable',
    label: 'Open quote-ready view',
  },
  {
    title: 'Edit product defaults',
    body: 'Use the product drawer for product rows, variants, trade details, and product-specific pricing snapshots that should affect future quotes.',
    href: '/products?mode=products',
    label: 'Open product setup',
  },
  {
    title: 'Work pricing coverage',
    body: 'Use Pricing view for baseline coverage and market-price gaps. Quote-only discounts and special terms stay inside Quotes.',
    href: '/products?mode=pricing&gap=has_gap',
    label: 'Open pricing view',
  },
];

export function ProductsWorkspaceActionMap() {
  return (
    <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-4 shadow-sm dark:border-sky-900/50 dark:bg-sky-950/25">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700 dark:text-sky-200">Product action map</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">Choose the right product action before editing</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Products is for daily catalog work. Product Management is for governance and defaults. Quotes is where customer-specific discounts, one-off commercial terms, and quote-only overrides stay.
          </p>
        </div>
        <Link href="/admin/product-management" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm ring-1 ring-blue-100 transition hover:bg-blue-50 dark:bg-slate-950 dark:text-sky-100 dark:ring-sky-900/60">
          Product Management
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => (
          <Link key={action.title} href={action.href} className="group rounded-2xl bg-white p-3 shadow-sm ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-950/80 dark:ring-sky-900/60">
            <p className="font-semibold text-slate-950 dark:text-slate-50">{action.title}</p>
            <p className="mt-1 min-h-14 text-sm leading-5 text-slate-500 dark:text-slate-300">{action.body}</p>
            <span className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100 group-hover:bg-blue-100 dark:bg-sky-950/60 dark:text-sky-200 dark:ring-sky-900/60">{action.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
