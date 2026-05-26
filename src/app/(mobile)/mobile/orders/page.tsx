import { EmptyState } from '@/components/ui/empty-state';
import { MobileOrderList } from '@/features/mobile/orders/mobile-order-list';
import { loadMobileOrders } from '@/features/mobile/orders/mobile-orders-data';

export default async function MobileOrdersPage() {
  const orders = await loadMobileOrders();
  if (!orders.length) {
    return <EmptyState title="No mobile orders yet" description="Accepted execution orders will appear here once they are ready for mobile follow-up." />;
  }
  return <MobileOrderList orders={orders} />;
}
