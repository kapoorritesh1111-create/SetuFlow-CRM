'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MobileHomeHero } from '@/features/mobile/components/mobile-navigation';
import { getEnabledModuleSet, type OrgModuleGrant } from '@/lib/modules/module-grants';

// Mobile 3.0 action-first workspace. Existing authenticated routes own all data
// mutations, pricing, ownership validation, and permission enforcement.
export default function MobileHomePage() {
  const [grants, setGrants] = useState<OrgModuleGrant[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    fetch('/api/modules/grants', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Module permissions unavailable');
        return response.json() as Promise<{ grants?: OrgModuleGrant[] }>;
      })
      .then(data => {
        if (active) {
          setGrants(Array.isArray(data.grants) ? data.grants : []);
          setLoaded(true);
        }
      })
      .catch(() => { if (active) { setGrants([]); setLoaded(true); } });
    return () => { active = false; controller.abort(); };
  }, []);

  const enabled = getEnabledModuleSet(grants);
  const crm = enabled.has('full_crm');
  const tradeShow = enabled.has('trade_show');
  const guru = enabled.has('setu_guru');
  const vcard = enabled.has('vcard');

  const actions = [
    ...(crm ? [
      { href: '/leads', title: 'Continue with customers', description: 'Review customer history, notes and next actions', icon: '◎' },
      { href: '/quick-quote', title: 'Prepare a Quick Quote', description: 'Use verified prices, constructions and quantities', icon: '▤' },
      { href: '/tasks', title: 'Follow-ups and meetings', description: 'Review assigned work and overdue actions', icon: '✓' },
    ] : []),
    ...(tradeShow ? [{ href: '/trade-events', title: 'Trade Show Mode', description: 'Capture visitors and track event synchronization', icon: '▣' }] : []),
    ...(guru ? [{ href: '/mobile/guru', title: 'Ask Setu Guru', description: 'Get help with your next sales activity', icon: '✦' }] : []),
    ...(vcard ? [{ href: '/contact-exchange/vcard', title: 'My digital business card', description: 'Share your verified contact details', icon: '▦' }] : []),
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-hero border border-line bg-surface-1 p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-content-muted">My workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-content-primary">Your day, in focus.</h1>
        <p className="mt-2 text-sm leading-5 text-content-muted">Pick up where you left off, without losing customer context.</p>
      </section>
      <MobileHomeHero />
      <section aria-label="Mobile next actions" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-content-primary">Get things done</h2>
          {crm ? <Link href="/leads" className="text-xs font-semibold text-brand-700 dark:text-sky-300">View customers ›</Link> : null}
        </div>
        {!loaded ? <p role="status" className="rounded-2xl border border-line bg-surface-1 p-4 text-xs text-content-muted">Loading your permitted workspace…</p> : null}
        {loaded && actions.length === 0 ? <p role="status" className="rounded-2xl border border-line bg-surface-1 p-4 text-xs text-content-muted">No mobile actions are enabled for this workspace. Contact your administrator if you need access.</p> : null}
        {actions.map(action => (
          <Link key={action.href} href={action.href} className="flex min-h-[78px] items-center gap-3 rounded-2xl border border-line bg-surface-1 p-4 shadow-sm transition active:scale-[.99]">
            <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl font-semibold text-content-primary">{action.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-content-primary">{action.title}</span>
              <span className="mt-1 block text-xs leading-4 text-content-muted">{action.description}</span>
            </span>
            <span aria-hidden="true" className="text-content-muted">›</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
