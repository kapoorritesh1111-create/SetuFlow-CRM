'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppWindow, CalendarDays, CircleHelp, ClipboardList, Grid2X2, Mail, Search, UsersRound } from 'lucide-react';
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

function bridgeSearch(value: string) {
  const target = document.querySelector<HTMLInputElement>('input[aria-label="Search mailbox"]');
  if (!target) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(target, value);
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

function RailLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return <Link href={href} className={styles.railButton} aria-label={label} title={label}>{children}</Link>;
}

export function MailProductShell({ children, profileName, profileEmail, avatarUrl, organizationName }: { children: ReactNode; profileName: string; profileEmail: string; avatarUrl?: string | null; organizationName: string }) {
  const [access, setAccess] = useState<AccessPayload>({ activeMailboxId: null, crmEnabled: true, mailboxes: [] });
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/mail/active-mailbox', { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json() as AccessPayload;
        if (!response.ok) throw new Error(payload.error || 'Unable to load mailbox access.');
        if (active) setAccess(payload);
      })
      .catch(() => { if (active) setAccess((current) => ({ ...current, mailboxes: [] })); });
    return () => { active = false; };
  }, []);

  const activeMailbox = useMemo(() => access.mailboxes.find((mailbox) => mailbox.id === access.activeMailboxId) ?? access.mailboxes[0] ?? null, [access]);

  return (
    <div className={styles.shell} data-setu-mail-shell>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <button type="button" className={styles.launcher} aria-label="Setu apps" title="Setu apps"><Grid2X2 size={18}/></button>
          <img src="/logos/setu-flow-logo.svg" alt="Setu Flow" className={styles.logo}/>
          <div className={styles.brandText}><strong>Setu Mail</strong><span>{organizationName}</span></div>
        </div>
        <label className={styles.searchBox}>
          <Search size={17}/>
          <input value={search} onChange={(event) => { setSearch(event.target.value); bridgeSearch(event.target.value); }} placeholder="Search mail" aria-label="Search Setu Mail"/>
        </label>
        <div className={styles.topActions}>
          {access.mailboxes.length > 0 ? (
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
          ) : activeMailbox ? <span className={styles.mailboxLabel}>{activeMailbox.address}</span> : null}
          <Link href="/support" className={styles.iconLink} aria-label="Help" title="Help"><CircleHelp size={18}/></Link>
          <Link href="/profile" className={styles.profileButton} aria-label="Open profile" title={profileEmail || profileName}>
            <UserAvatar name={profileName} email={profileEmail} avatarUrl={avatarUrl} size="sm" />
          </Link>
        </div>
      </header>
      <div className={styles.body}>
        <nav className={styles.rail} aria-label="Setu Mail apps">
          <div className={`${styles.railButton} ${styles.active}`} aria-current="page" title="Mail"><Mail size={20}/></div>
          <button type="button" className={styles.railButton} disabled aria-label="Calendar — coming next" title="Calendar — coming next"><CalendarDays size={20}/></button>
          {access.crmEnabled ? <>
            <RailLink href="/leads" label="Contacts and leads"><UsersRound size={20}/></RailLink>
            <RailLink href="/tasks" label="Tasks"><ClipboardList size={20}/></RailLink>
            <RailLink href="/dashboard" label="Setu Flow CRM"><AppWindow size={20}/></RailLink>
          </> : null}
        </nav>
        <main className={styles.content} id="app-content">{children}</main>
      </div>
    </div>
  );
}
