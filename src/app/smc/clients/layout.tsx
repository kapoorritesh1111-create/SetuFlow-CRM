import Link from 'next/link';
import type { ReactNode } from 'react';
import { getRiteshClientUserOperator } from '@/lib/smc/client-user-access';

export const dynamic = 'force-dynamic';

export default async function SmcClientsLayout({ children }: { children: ReactNode }) {
  const operator = await getRiteshClientUserOperator();

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {operator ? (
        <div
          style={{
            position: 'absolute',
            top: 18,
            right: 24,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Link
            href="/smc/client-users"
            className="smc-btn primary"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              boxShadow: '0 8px 20px rgba(39, 148, 145, 0.2)',
            }}
          >
            <span aria-hidden="true">+</span>
            Client User Setup
          </Link>
        </div>
      ) : null}
      {children}
    </div>
  );
}
