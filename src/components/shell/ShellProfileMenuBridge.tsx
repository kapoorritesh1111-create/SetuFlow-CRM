'use client';

import { useEffect, useState } from 'react';

function looksLikeProfileButton(button: HTMLButtonElement) {
  const text = button.textContent ?? '';
  if (!text.includes('@')) return false;
  if (!button.querySelector('span')) return false;
  return true;
}

export function ShellProfileMenuBridge() {
  const [anchor, setAnchor] = useState<{ top: number; right: number; name: string; email: string } | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-shell-profile-menu]')) return;
      const button = target.closest('button');
      if (!(button instanceof HTMLButtonElement) || !looksLikeProfileButton(button)) {
        setAnchor(null);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const rect = button.getBoundingClientRect();
      const spans = Array.from(button.querySelectorAll('span')).map((span) => span.textContent?.trim()).filter(Boolean) as string[];
      const email = spans.find((value) => value.includes('@')) ?? '';
      const name = spans.find((value) => value && value !== email) ?? 'Profile';
      setAnchor({ top: rect.bottom + 8, right: Math.max(16, window.innerWidth - rect.right), name, email });
    }

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, []);

  if (!anchor) return null;

  return (
    <div
      data-shell-profile-menu
      className="fixed z-[9999] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
      style={{ top: anchor.top, right: anchor.right }}
    >
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <p className="truncate text-sm font-black text-slate-950">{anchor.name}</p>
        <p className="truncate text-xs font-semibold text-slate-500">{anchor.email}</p>
      </div>
      <div className="p-2">
        <a href="/profile" className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">
          Profile settings
        </a>
        <a href="/contact-exchange/vcard" className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700">
          My vCard
        </a>
        <form action="/api/logout" method="post" className="mt-1 border-t border-slate-100 pt-1">
          <button type="submit" className="block w-full rounded-xl px-3 py-2 text-left text-sm font-black text-rose-600 hover:bg-rose-50">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
