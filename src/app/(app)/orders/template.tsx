import type { ReactNode } from 'react';
import { OrdersExecutionModalPolish } from '@/features/orders/components/OrdersExecutionModalPolish';

export default function OrdersTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <OrdersExecutionModalPolish />
      {children}
    </>
  );
}
