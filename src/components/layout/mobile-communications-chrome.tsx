'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays, ContactRound, LayoutGrid, Mail } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import styles from './mobile-communications-chrome.module.css';

type Props = { crmEnabled: boolean; unreadMailCount?: number };
type BadgingNavigator = Navigator & { setAppBadge?: (contents?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

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

export function MobileCommunicationsChrome({ crmEnabled, unreadMailCount = 0 }: Props) {
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

  useEffect(() => {
    const badgeNavigator = navigator as BadgingNavigator;
    const unread = Math.max(0, Math.floor(Number(unreadMailCount) || 0));
    if (unread > 0 && badgeNavigator.setAppBadge) {
      void badgeNavigator.setAppBadge(unread).catch(() => undefined);
    } else if (unread === 0 && badgeNavigator.clearAppBadge) {
      void badgeNavigator.clearAppBadge().catch(() => undefined);
    }
  }, [unreadMailCount]);

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
          const badge = tab.href === '/mail' ? Math.max(0, Number(unreadMailCount) || 0) : 0;
          return (
            <Link
              key={tab.href}
              href={tabHref(tab.href)}
              className={`${styles.tab} ${active ? styles.active : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={styles.iconWrap}>
                <Icon size={21} strokeWidth={active ? 2.5 : 2} />
                {badge > 0 ? <span className={styles.badge} aria-label={`${badge} unread messages`}>{badge > 99 ? '99+' : badge}</span> : null}
              </span>
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
