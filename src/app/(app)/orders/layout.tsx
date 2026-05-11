import type { ReactNode } from 'react';
import { OrdersShellEightF } from '@/features/orders/components/OrdersShellEightF';

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return <OrdersShellEightF>{children}</OrdersShellEightF>;
}
