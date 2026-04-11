import Link from 'next/link';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

const links = [
  { href: PRODUCT_ROUTES.development.home, label: 'Development hub' },
  { href: PRODUCT_ROUTES.development.masterPlan, label: 'Master plan' },
  { href: PRODUCT_ROUTES.development.readiness, label: 'Readiness' },
  { href: PRODUCT_ROUTES.development.backlog, label: 'Backlog' },
  { href: PRODUCT_ROUTES.development.product, label: 'Product' },
  { href: PRODUCT_ROUTES.development.architecture, label: 'Architecture' },
  { href: PRODUCT_ROUTES.development.uxRules, label: 'UX rules' },
  { href: PRODUCT_ROUTES.development.screens, label: 'Screen specs' },
];

export function DevelopmentNav() {
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="rounded-full border border-[#1F487C]/15 bg-white px-4 py-2 text-sm font-semibold text-[#1F487C] transition hover:border-[#1F487C] hover:bg-[#1F487C]/5"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}
