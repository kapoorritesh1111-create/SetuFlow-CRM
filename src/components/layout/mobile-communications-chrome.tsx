'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, ContactRound, LayoutGrid, Mail } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import styles from './mobile-communications-chrome.module.css';

type Props = { crmEnabled: boolean };

type Tab = {
  href: string;
  label: string;
  matches: (pathname: string) => boolean;
  icon: typeof Mail;
};

const tabs: Tab[] = [
  { href: '/mail', label: 'Mail', matches: pathname => pathname === '/mail' || pathname.startsWith('/mail/'), icon: Mail },
  { href: '/calendar', label: 'Calendar', matches: pathname => pathname === '/calendar' || pathname.startsWith('/calendar/'), icon: CalendarDays },
  { href: '/contacts', label: 'People', matches: pathname => pathname === '/contacts' || pathname.startsWith('/contacts/'), icon: ContactRound },
];

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export function MobileCommunicationsChrome({ crmEnabled }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const explicitCrmLaunch = params.get('from') === 'crm' || params.get('source') === 'crm';
  const returnTo = useMemo(() => safeReturnTo(params.get('returnTo')), [params]);
  const [crmReturnVisible, setCrmReturnVisible] = useState(explicitCrmLaunch);

  useEffect(() => {
    try {
      if (explicitCrmLaunch) {
        sessionStorage.setItem('setu-communications-from-crm', '1');
        sessionStorage.setItem('setu-communications-return-to', returnTo);
        setCrmReturnVisible(true);
        return;
      }
      setCrmReturnVisible(sessionStorage.getItem('setu-communications-from-crm') === '1');
    } catch {
      setCrmReturnVisible(explicitCrmLaunch);
    }
  }, [explicitCrmLaunch, returnTo]);

  const tabHref = (href: string) => {
    if (!crmReturnVisible) return href;
    const query = new URLSearchParams({ from: 'crm', returnTo });
    return `${href}?${query.toString()}`;
  };

  const crmHref = useMemo(() => {
    if (explicitCrmLaunch) return returnTo;
    try {
      return safeReturnTo(sessionStorage.getItem('setu-communications-return-to'));
    } catch {
      return '/dashboard';
    }
  }, [explicitCrmLaunch, returnTo]);

  return (
    <nav className={styles.nav} aria-label="SETU Mail mobile navigation" data-setu-communications-mobile-nav>
      <div className={`${styles.inner} ${crmEnabled && crmReturnVisible ? styles.withCrm : ''}`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = tab.matches(pathname);
          return (
            <Link
              key={tab.href}
              href={tabHref(tab.href)}
              className={`${styles.tab} ${active ? styles.active : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={21} strokeWidth={active ? 2.5 : 2} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
        {crmEnabled && crmReturnVisible ? (
          <Link
            href={crmHref}
            className={styles.tab}
            onClick={() => {
              try {
                sessionStorage.removeItem('setu-communications-from-crm');
                sessionStorage.removeItem('setu-communications-return-to');
              } catch {}
            }}
            aria-label="Back to Setu Flow CRM"
          >
            <LayoutGrid size={21} />
            <span>CRM</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
