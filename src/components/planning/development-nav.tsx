import Link from 'next/link';

const links = [
  { href: '/development', label: 'Development hub' },
  { href: '/development/master-plan', label: 'Master plan' },
  { href: '/development/readiness', label: 'Readiness' },
  { href: '/development/screens/leads-capture', label: 'Screen specs' },
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
