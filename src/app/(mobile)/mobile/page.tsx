'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMobilePermissions } from '@/features/mobile/components/mobile-permissions';

type WorkspacePulse = {
  organizationId: string;
  leads: number | null;
  quotes: number | null;
  team: number | null;
  partial: boolean;
};

function PulseValue({ value, label, href }: { value: number | null; label: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-surface-1 p-4 shadow-sm transition active:scale-[.98]">
      <span className="block text-2xl font-bold tabular-nums text-content-primary">{value === null ? '—' : value.toLocaleString()}</span>
      <span className="mt-1 block text-xs font-medium text-content-muted">{label}</span>
    </Link>
  );
}

function ActionCard({ href, title, description, icon, featured = false }: {
  href: string; title: string; description: string; icon: string; featured?: boolean;
}) {
  return (
    <Link href={href} className={`flex min-h-[112px] flex-col justify-between rounded-2xl border p-4 shadow-sm transition active:scale-[.98] ${featured ? 'border-blue-700 bg-blue-800 text-white' : 'border-line bg-surface-1 text-content-primary'}`}>
      <span aria-hidden="true" className={`grid h-10 w-10 place-items-center rounded-xl text-xl ${featured ? 'bg-white/15 text-white' : 'bg-surface-2 text-content-primary'}`}>{icon}</span>
      <span className="mt-3">
        <span className="block text-sm font-bold">{title}</span>
        <span className={`mt-1 block text-[11px] leading-4 ${featured ? 'text-blue-100' : 'text-content-muted'}`}>{description}</span>
      </span>
    </Link>
  );
}

export default function MobileHomePage() {
  const { enabled, canAccessAdmin, loaded, error: grantsError, refresh } = useMobilePermissions();
  const crm = enabled.has('full_crm');
  const tradeShow = enabled.has('trade_show');
  const guru = enabled.has('setu_guru');
  const vcard = enabled.has('vcard');
  const communications = enabled.has('setu_mail');

  const [pulse, setPulse] = useState<WorkspacePulse | null>(null);
  const [pulseError, setPulseError] = useState(false);
  useEffect(() => {
    if (!loaded || !crm) return;
    const controller = new AbortController();
    fetch('/api/mobile/workspace-summary', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Summary unavailable');
        return response.json() as Promise<WorkspacePulse>;
      })
      .then(data => {
        if (controller.signal.aborted) return;
        setPulse(data);
        setPulseError(Boolean(data.partial));
      })
      .catch(() => { if (!controller.signal.aborted) setPulseError(true); });
    return () => controller.abort();
  }, [crm, loaded]);

  const primaryActions = [
    ...(crm ? [
      { href: '/leads', title: 'Continue with customers', description: 'Leads and conversations', icon: '◎' },
      { href: '/quick-quote', title: 'Prepare a Quick Quote', description: 'Verified quantity pricing', icon: '▤' },
      { href: '/tasks', title: 'Follow-ups and meetings', description: 'Your next commitments', icon: '✓' },
    ] : []),
    ...(tradeShow ? [{ href: '/mobile/capture', title: 'Scan a business card', description: 'Review before saving', icon: '▣' }] : []),
  ];
  const secondaryActions = [
    ...(canAccessAdmin && crm ? [{ href: '/leads/inbound/assignments', title: 'Review inbound assignments', description: 'Manage existing routing deliberately', icon: '◇' }] : []),
    ...(communications ? [{ href: '/mail', title: 'Mail workspace', description: 'Open your licensed inbox', icon: '✉' }, { href: '/calendar', title: 'Meetings and calendar', description: 'View scheduled calls', icon: '▦' }] : []),
    ...(tradeShow ? [{ href: '/trade-events', title: 'Trade Show Mode', description: 'Event capture and sync status', icon: '▣' }] : []),
    ...(guru ? [{ href: '/mobile/guru', title: 'Ask Setu Guru', description: 'Get help with your next action', icon: '✦' }] : []),
    ...(vcard ? [{ href: '/contact-exchange/vcard', title: 'My digital business card', description: 'Share your contact details', icon: '▦' }] : []),
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-line bg-surface-1 p-5 shadow-sm" aria-label="Workspace welcome">
        <p className="text-[10px] font-bold uppercase tracking-[.15em] text-content-muted">My workspace</p>
        <h1 className="mt-2 text-[23px] font-bold tracking-tight text-content-primary">Your next move, made simple.</h1>
        <p className="mt-2 text-sm leading-5 text-content-muted">Customers, quotations and follow-ups in one place.</p>
        {canAccessAdmin ? <Link href="/mobile/owner" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand-800 px-4 text-xs font-bold text-white">Open owner command center <span className="ml-2">›</span></Link> : null}
      </section>

      {!loaded ? <p role="status" className="rounded-2xl border border-line bg-surface-1 p-4 text-sm text-content-muted">Loading your workspace…</p> : null}
      {loaded && grantsError ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-semibold">Workspace permissions could not load.</p>
        <p className="mt-1">No permissions have been changed. Retry your connection.</p>
        <button type="button" onClick={refresh} className="mt-2 min-h-11 font-bold underline">Retry permissions</button>
      </div> : null}

      {crm && loaded ? <section className="space-y-2" aria-label="Live workspace summary">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-content-primary">Workspace at a glance</h2>
          <span className="text-[10px] font-medium text-content-muted">{pulseError ? 'Data unavailable' : pulse ? 'Live CRM data' : 'Loading…'}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PulseValue value={pulse?.leads ?? null} label="Visible leads" href="/leads" />
          <PulseValue value={pulse?.quotes ?? null} label="Visible quotations" href="/quotes" />
        </div>
      </section> : null}

      {primaryActions.length ? <section aria-label="Mobile next actions" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-content-primary">Get things done</h2>
          {crm ? <Link href="/leads" className="text-xs font-semibold text-brand-700 dark:text-sky-300">View customers ›</Link> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {primaryActions.map((action, index) => <ActionCard key={action.href} {...action} featured={index === 0} />)}
        </div>
      </section> : null}

      {secondaryActions.length ? <section className="space-y-2" aria-label="More workspace tools">
        <h2 className="text-sm font-bold text-content-primary">More for your day</h2>
        {secondaryActions.map(action => (
          <Link key={action.href + action.title} href={action.href} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-line bg-surface-1 px-4 py-3 transition active:scale-[.99]">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg text-content-primary">{action.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-content-primary">{action.title}</span>
              <span className="mt-1 block text-[11px] leading-4 text-content-muted">{action.description}</span>
            </span>
            <span aria-hidden="true" className="text-content-muted">›</span>
          </Link>
        ))}
      </section> : null}

      {loaded && !grantsError && !primaryActions.length && !secondaryActions.length ? <p role="status" className="rounded-2xl border border-line bg-surface-1 p-4 text-sm text-content-muted">No mobile modules are enabled for this organization. Contact your administrator.</p> : null}
    </div>
  );
}
