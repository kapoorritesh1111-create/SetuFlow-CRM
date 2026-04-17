'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="text-lg font-semibold">SETU Flow</div>

        <div className="flex items-center gap-4">
          {/* ✅ FIXED: Share Card Button */}
          <a
            href="/contact-exchange/vcard"
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Share card
          </a>

          <div className="text-sm text-slate-600">User</div>
        </div>
      </header>

      {/* Page Content */}
      <main className="p-6">{children}</main>
    </div>
  );
}