'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './mobile-communication-surfaces.module.css';
import { CommunicationAppearanceControl } from './communication-appearance-control';

/** Native top-layer dialog: no invisible overlay can intercept header taps. */
export function MobileCommunicationDrawer({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = oldOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={dialog} className={styles.drawer} aria-label={title}
    onCancel={event => { event.preventDefault(); close.current(); }}
    onClick={event => { if (event.target === event.currentTarget) close.current(); }}>
    <div className={styles.drawerBody}>
      <header className={styles.drawerHeader}><div><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div><button type="button" className={styles.iconButton} onClick={onClose} aria-label={`Close ${title}`}><X size={22} /></button></header>
      <div className={styles.drawerContent}>{children}<CommunicationAppearanceControl/></div>
    </div>
  </dialog>;
}

type Mailbox = { id: string; address: string; display_name: string | null; can_read: boolean };
export function MobileMailboxSelector() {
  const [data, setData] = useState<{ mailboxes: Mailbox[]; activeMailboxId: string | null } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/mail/active-mailbox', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Could not load mailbox accounts.');
      const payload = await response.json();
      if (!controller.signal.aborted) setData(payload);
    }).catch(() => { if (!controller.signal.aborted) setError('Mailbox accounts could not be loaded.'); });
    return () => controller.abort();
  }, []);
  if (error) return <p className={styles.hint} role="status">{error}</p>;
  if (!data) return <p className={styles.hint}>Loading accounts...</p>;
  return <form action="/api/mail/active-mailbox" method="post" className={styles.accountForm}>
    <label htmlFor="mobile-mailbox-account">Mailbox account</label>
    <select id="mobile-mailbox-account" name="mailboxId" defaultValue={data.activeMailboxId || ''} onChange={event => event.currentTarget.form?.requestSubmit()}>
      {data.mailboxes.filter(mailbox => mailbox.can_read).map(mailbox => <option value={mailbox.id} key={mailbox.id}>{mailbox.display_name ? `${mailbox.display_name} - ` : ''}{mailbox.address}</option>)}
    </select>
  </form>;
}
