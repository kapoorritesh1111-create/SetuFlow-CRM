'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function OrdersRouteSwitch({ children, ordersView }: { children: React.ReactNode; ordersView: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const supplierMode = searchParams.get('mode') === 'suppliers';
  const supplierRoute = pathname.startsWith('/orders/supplier-links');

  useEffect(() => {
    if (supplierMode && !supplierRoute) {
      router.replace('/orders/supplier-links?mode=suppliers', { scroll: false });
    }
  }, [router, supplierMode, supplierRoute]);

  if (supplierRoute) return <>{children}</>;
  if (supplierMode) {
    return (
      <div className="rounded-[1.5rem] border border-teal-200 bg-teal-50 p-6 text-sm text-teal-900">
        Opening supplier execution links…
      </div>
    );
  }
  return <>{ordersView}</>;
}
