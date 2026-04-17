'use client';

import { ReactNode } from 'react';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="text-lg font-semibold">SETU Flow</div>

        <div className="flex items-center gap-4">
          <a
            href="/contact-exchange/vcard"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Share card
          </a>

          <div className="text-sm text-slate-600">User</div>
        </div>
      </header>

      <main className="p-6">{children}</main>
    </div>
  );
}

export default AppShell;