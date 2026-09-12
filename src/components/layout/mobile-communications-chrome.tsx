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
  const explicitStandaloneLaunch = params.get('app') === 'setu-mail';
  const queryReturnTo = useMemo(() => safeReturnTo(params.get('returnTo')), [params]);
  const [crmReturnVisible, setCrmReturnVisible] = useState(explicitCrmLaunch);
  const [crmReturnTo, setCrmReturnTo] = useState(queryReturnTo);

  useEffect(() => {
    try {
      if (explicitCrmLaunch) {
        sessionStorage.setItem('setu-communications-from-crm', '1');
        sessionStorage.setItem('setu-communications-return-to', queryReturnTo);
        setCrmReturnVisible(true);
        setCrmReturnTo(queryReturnTo);
        return;
      }
      const fromCrm = sessionStorage.getItem('setu-communications-from-crm') === '1';
      const storedReturnTo = safeReturnTo(sessionStorage.getItem('setu-communications-return-to'));
      setCrmReturnVisible(fromCrm);
      setCrmReturnTo(storedReturnTo);
    } catch {
      setCrmReturnVisible(explicitCrmLaunch);
      setCrmReturnTo(queryReturnTo);
    }
  }, [explicitCrmLaunch, queryReturnTo]);

  const tabHref = (href: string) => {
    if (crmReturnVisible) {
      const query = new URLSearchParams({ from: 'crm', returnTo: crmReturnTo });
      return `${href}?${query.toString()}`;
    }
    if (explicitStandaloneLaunch) return `${href}?app=setu-mail`;
    return href;
  };

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
            href={crmReturnTo}
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
