import { notFound } from 'next/navigation';
import { MobileOrderDetail } from '@/features/mobile/orders/mobile-order-detail';
import { loadMobileOrder } from '@/features/mobile/orders/mobile-orders-data';

export default async function MobileOrderDetailPage({ params }: { params: { orderId: string } }) {
  const order = await loadMobileOrder(params.orderId);
  if (!order) notFound();
  return <MobileOrderDetail order={order} />;
}
