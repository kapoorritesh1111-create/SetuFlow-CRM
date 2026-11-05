import Link from 'next/link';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function CountCard({
  label, value, href, detail,
}: {
  label: string; value: number | null; href: string; detail: string;
}) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-surface-1 p-4 shadow-sm transition active:scale-[.98]">
      <p className="text-xs font-semibold text-content-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-content-primary">{value === null ? '—' : value.toLocaleString()}</p>
      <p className="mt-2 text-[11px] leading-4 text-content-muted">{value === null ? 'Data unavailable · open workspace' : detail}</p>
    </Link>
  );
}

const STARK_PACKMATE_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';

export default async function MobileOwnerPage() {
  // Server authorization is mandatory; hiding the card is not a permission boundary.
  const workspace = await requireAdminWorkspace();
  if (!workspace.organization || !workspace.membership) return null;
  const organization = workspace.organization;
  const supabase = await createClient();
  const [leadsResult, quotesResult, teamResult] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('organization_members').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).eq('is_active', true),
  ]);

  const isStark = organization.id === STARK_PACKMATE_ID || organization.slug === 'starkpackmate';

  return (
    <div className="space-y-5 pb-6">
      <header className="rounded-3xl border border-line bg-surface-1 p-5 shadow-sm">
        <Link href="/mobile" className="inline-flex min-h-11 items-center text-xs font-semibold text-brand-700 dark:text-sky-300">← Mobile Home</Link>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[.16em] text-content-muted">Owner workspace</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">Your team, in focus.</h1>
        <p className="mt-2 text-sm leading-5 text-content-muted">{organization.name} · Live organization data, not sample metrics.</p>
      </header>

      <section aria-label="Live workspace overview" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-content-primary">Workspace overview</h2>
          <span className="text-[10px] font-semibold text-content-muted">Live</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CountCard label="Leads" value={leadsResult.error ? null : leadsResult.count ?? null} href="/leads" detail="Total organization records" />
          <CountCard label="Quotations" value={quotesResult.error ? null : quotesResult.count ?? null} href="/quotes" detail="Review commercial activity" />
          <CountCard label="Active team" value={teamResult.error ? null : teamResult.count ?? null} href="/tasks" detail="Active organization members" />
          <Link href="/tasks" className="flex flex-col justify-center rounded-2xl border border-line bg-surface-1 p-4 shadow-sm"><span className="text-xs font-semibold text-content-muted">Follow-ups</span><span className="mt-2 text-base font-bold text-content-primary">Open task queue →</span><span className="mt-2 text-[11px] leading-4 text-content-muted">Review scheduled work</span></Link>
        </div>
      </section>

      <section aria-label="Owner mobile actions" className="space-y-2">
        <h2 className="text-base font-bold text-content-primary">Manage today</h2>
        {[
          { href: '/leads', title: 'Customer and lead review', description: 'Open real lead records and activity history', icon: '◎' },
          { href: '/quotes', title: 'Quotation review', description: 'Review quotes and customer responses', icon: '▤' },
          { href: '/tasks', title: 'Follow-ups and meetings', description: 'Check commitments and overdue work', icon: '✓' },
          ...(isStark ? [{ href: '/leads/inbound/assignments', title: 'Inbound lead assignments', description: 'Review Sales / Field Sales routing without automatic reassignment', icon: '◇' }] : []),
        ].map((action) => (
          <Link key={action.href} href={action.href} className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-line bg-surface-1 p-4 shadow-sm transition active:scale-[.99]">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg font-bold text-content-primary">{action.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-content-primary">{action.title}</span>
              <span className="mt-1 block text-xs text-content-muted">{action.description}</span>
            </span>
            <span aria-hidden="true" className="text-content-muted">›</span>
          </Link>
        ))}
      </section>
      <p className="rounded-xl border border-line bg-surface-1 px-4 py-3 text-xs leading-5 text-content-muted">Advanced configuration, pricing publication, and organization governance remain desktop-only. This mobile workspace provides the owner’s daily operational actions.</p>
    </div>
  );
}
