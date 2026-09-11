'use client';

import { useEffect, useRef, useState } from 'react';

/** This is a structural shell slot, never an email-address/content heuristic. */
export function shellProfileTrigger(root: Document): HTMLButtonElement | null {
  const header = root.querySelector('#app-content > header');
  return header?.querySelector<HTMLButtonElement>('[data-shell-profile-trigger]') ?? null;
}

export function ShellProfileMenuBridge() {
  const [anchor, setAnchor] = useState<{ top: number; right: number; name: string; email: string; trigger: HTMLButtonElement } | null>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-shell-profile-menu]')) return;
      const trigger = shellProfileTrigger(document);
      if (!trigger || target.closest('button') !== trigger) { setAnchor(null); return; }
      const rect = trigger.getBoundingClientRect();
      const name = trigger.dataset.profileName || 'Profile';
      const email = trigger.dataset.profileEmail || '';
      setAnchor(previous => previous?.trigger === trigger ? null : {
        top: rect.bottom + 8, right: Math.max(16, window.innerWidth - rect.right), name, email, trigger,
      });
      // Let the shell's own React handler run. Mail clicks are never intercepted.
    }
    function dismiss() { setAnchor(null); }
    document.addEventListener('click', onDocumentClick);
    window.addEventListener('resize', dismiss);
    return () => { document.removeEventListener('click', onDocumentClick); window.removeEventListener('resize', dismiss); };
  }, []);

  useEffect(() => {
    if (!anchor) return;
    const trigger = anchor.trigger;
    trigger.setAttribute('aria-expanded', 'true');
    trigger.setAttribute('aria-controls', 'shell-profile-popover');
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { setAnchor(null); trigger.focus(); }
    }
    document.addEventListener('keydown', onKey);
    menu.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    return () => { trigger.setAttribute('aria-expanded', 'false'); trigger.removeAttribute('aria-controls'); document.removeEventListener('keydown', onKey); };
  }, [anchor]);

  if (!anchor) return null;
  return <div ref={menu} id="shell-profile-popover" data-shell-profile-menu role="region" aria-label="Profile options"
    className="fixed z-[9999] w-72 overflow-hidden rounded-card border border-border bg-surface-1 text-content-primary shadow-panel"
    style={{ top: anchor.top, right: anchor.right }}>
    <div className="border-b border-border bg-surface-2 px-4 py-3"><p className="truncate text-sm font-semibold">{anchor.name}</p><p className="truncate text-xs text-content-secondary">{anchor.email}</p></div>
    <div className="p-2"><a href="/profile" className="block rounded-ctl px-3 py-2 text-sm font-semibold hover:bg-surface-2">Profile settings</a>
      <a href="/contact-exchange/vcard" className="block rounded-ctl px-3 py-2 text-sm font-semibold hover:bg-surface-2">My vCard</a>
      <form action="/api/logout" method="post" className="mt-1 border-t border-border pt-1"><button type="submit" className="block w-full rounded-ctl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-surface-2">Sign out</button></form>
    </div>
  </div>;
}
