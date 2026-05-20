import type { ReactNode } from 'react';
import { OrderCatalogProductTypeahead } from '@/features/orders/components/OrderCatalogProductTypeahead';

export default function OrdersTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <OrderCatalogProductTypeahead />
      {children}
    </>
  );
}
