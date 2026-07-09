'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function OrdersRouteSwitch({ children, ordersView }: { children: React.ReactNode; ordersView: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode');
  const supplierMode = mode === 'suppliers';
  const supplierRoute = pathname.startsWith('/orders/supplier-links');

  useEffect(() => {
    // Supplier mode → redirect to supplier execution view
    if (supplierMode && !supplierRoute) {
      router.replace('/orders/supplier-links?mode=suppliers', { scroll: false });
      return;
    }
    // Buyer mode or All mode while on supplier-links → redirect back to main orders
    if (!supplierMode && supplierRoute) {
      const params = new URLSearchParams();
      if (mode && mode !== 'all') params.set('mode', mode);
      const query = params.toString();
      router.replace(query ? `/orders?${query}` : '/orders', { scroll: false });
    }
  }, [router, supplierMode, supplierRoute, mode]);

  if (supplierRoute) return <>{children}</>;
  if (supplierMode) {
    return (
      <div className="rounded-panel border border-teal-200 bg-teal-50 p-6 text-sm text-teal-900">
        Opening supplier execution links…
      </div>
    );
  }
  return <>{ordersView}</>;
}
