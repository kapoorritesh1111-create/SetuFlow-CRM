'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function OfflineAwareCaptureLink({
  href,
  offlineHref,
  className,
  children,
}: {
  href: string;
  offlineHref: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        if (typeof navigator === 'undefined' || navigator.onLine) return;
        event.preventDefault();
        router.push(offlineHref);
      }}
    >
      {children}
    </Link>
  );
}
