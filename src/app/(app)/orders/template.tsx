import { OrderCatalogProductTypeahead } from '@/features/orders/components/OrderCatalogProductTypeahead';

export default function OrdersTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OrderCatalogProductTypeahead />
      {children}
    </>
  );
}
