'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, CircleHelp, ClipboardList, Grid2X2, Mail, Search, UsersRound } from 'lucide-react';
import { UserAvatar } from '@/components/ui/user-avatar';
import styles from './mail-product-shell.module.css';

type Mailbox = {
  id: string;
  address: string;
  display_name: string | null;
  is_primary: boolean;
  can_read: boolean;
  can_send: boolean;
  can_manage: boolean;
};

type AccessPayload = {
  activeMailboxId: string | null;
  crmEnabled: boolean;
  mailboxes: Mailbox[];
  error?: string;
};

function bridgeMailSearch(value: string) {
  const target = document.querySelector<HTMLInputElement>('input[aria-label="Search mailbox"]');
  if (!target) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(target, value);
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

function bridgeCalendarSearch(value: string) {
  window.dispatchEvent(new CustomEvent('setu-calendar-search', { detail: value }));
}

function RailLink({ href, label, active = false, children }: { href: string; label: string; active?: boolean; children: ReactNode }) {
  return <Link href={href} className={`${styles.railButton} ${active ? styles.active : ''}`} aria-label={label} title={label} aria-current={active ? 'page' : undefined}>{children}</Link>;
}

function CrmProductIcon({ menu = false }: { menu?: boolean }) {
  return (
    <img
      src="/logos/setu-flow-logo.svg"
      alt=""
      aria-hidden="true"
      className={menu ? 'h-[18px] w-[18px] shrink-0 rounded bg-white p-[1px] object-contain' : 'h-5 w-5 shrink-0 rounded-[5px] bg-white p-[1px] object-contain'}
    />
  );
}

export function MailProductShell({ children, profileName, profileEmail, avatarUrl, organizationName }: { children: ReactNode; profileName: string; profileEmail: string; avatarUrl?: string | null; organizationName: string }) {
  const pathname = usePathname();
  const isCalendar = pathname === '/calendar' || pathname.startsWith('/calendar/');
  const [access, setAccess] = useState<AccessPayload>({ activeMailboxId: null, crmEnabled: false, mailboxes: [] });
  const [search, setSearch] = useState('');
  const [appsOpen, setAppsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/mail/active-mailbox', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as AccessPayload;
        if (!response.ok) throw new Error(payload.error || 'Unable to load mailbox access.');
        if (active) setAccess(payload);
      })
      .catch(() => { if (active) setAccess((current) => ({ ...current, crmEnabled: false, mailboxes: [] })); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isCalendar) return;
    const target = document.querySelector<HTMLInputElement>('input[aria-label="Search mailbox"]');
    if (target) target.tabIndex = -1;
  }, [isCalendar]);

  useEffect(() => { setSearch(''); }, [pathname]);

  const activeMailbox = useMemo(() => access.mailboxes.find((mailbox) => mailbox.id === access.activeMailboxId) ?? access.mailboxes[0] ?? null, [access]);
  const productName = isCalendar ? 'Setu Calendar' : 'Setu Mail';
  const searchPlaceholder = isCalendar ? 'Search calendar' : 'Search mail';

  return (
    <div className={styles.shell} data-setu-mail-shell data-setu-communications-shell>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <div className={styles.launcherWrap}>
            <button type="button" className={styles.launcher} aria-label="Setu apps" title="Setu apps" aria-expanded={appsOpen} onClick={() => setAppsOpen((open) => !open)}><Grid2X2 size={18}/></button>
            {appsOpen ? <div className={styles.appMenu} role="menu" aria-label="Setu apps menu">
              <Link href="/mail" role="menuitem" onClick={() => setAppsOpen(false)}><Mail size={18}/><span><strong>Mail</strong><small>Messages and shared inboxes</small></span></Link>
              <Link href="/calendar" role="menuitem" onClick={() => setAppsOpen(false)}><CalendarDays size={18}/><span><strong>Calendar</strong><small>Meetings and schedules</small></span></Link>
              {access.crmEnabled ? <Link href="/dashboard" role="menuitem" onClick={() => setAppsOpen(false)}><CrmProductIcon menu/><span><strong>Setu Flow CRM</strong><small>Trade execution workspace</small></span></Link> : null}
            </div> : null}
          </div>
          <img src="/logos/setu-flow-logo.svg" alt="Setu Flow" className={styles.logo}/>
          <div className={styles.brandText}><strong>{productName}</strong><span>{organizationName}</span></div>
        </div>
        <label className={styles.searchBox}>
          <Search size={17}/>
          <input
            value={search}
            onChange={(event) => {
              const value = event.target.value;
              setSearch(value);
              if (isCalendar) bridgeCalendarSearch(value); else bridgeMailSearch(value);
            }}
            placeholder={searchPlaceholder}
            aria-label={isCalendar ? 'Search Setu Calendar' : 'Search Setu Mail'}
          />
        </label>
        <div className={styles.topActions}>
          {!isCalendar && access.mailboxes.length > 0 ? (
            <form action="/api/mail/active-mailbox" method="post" className={styles.mailboxForm}>
              <select
                name="mailboxId"
                aria-label="Switch mailbox"
                title="Switch mailbox"
                defaultValue={activeMailbox?.id ?? ''}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
              >
                {access.mailboxes.map((mailbox) => <option key={mailbox.id} value={mailbox.id}>{mailbox.display_name ? `${mailbox.display_name} — ` : ''}{mailbox.address}</option>)}
              </select>
            </form>
          ) : null}
          <Link href="/support" className={styles.iconLink} aria-label="Help" title="Help"><CircleHelp size={18}/></Link>
          <Link href="/profile" className={styles.profileButton} aria-label="Open profile" title={profileEmail || profileName}>
            <UserAvatar name={profileName} email={profileEmail} avatarUrl={avatarUrl} size="sm" />
          </Link>
        </div>
      </header>
      <div className={styles.body}>
        <nav className={styles.rail} aria-label="Setu communications apps">
          <RailLink href="/mail" label="Mail" active={!isCalendar}><Mail size={20}/></RailLink>
          <RailLink href="/calendar" label="Calendar" active={isCalendar}><CalendarDays size={20}/></RailLink>
          {access.crmEnabled ? <>
            <RailLink href="/leads" label="Contacts and leads"><UsersRound size={20}/></RailLink>
            <RailLink href="/tasks" label="Tasks"><ClipboardList size={20}/></RailLink>
            <RailLink href="/dashboard" label="Setu Flow CRM"><CrmProductIcon/></RailLink>
          </> : null}
        </nav>
        <main className={styles.content} id="app-content">{children}</main>
      </div>
    </div>
  );
}
