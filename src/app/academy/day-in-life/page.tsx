import type { Metadata } from 'next';
import { DayInLifeBuyerLeads } from '@/features/academy/day-in-life-buyer-leads';

export const metadata: Metadata = {
  title: 'Day in the Life | Setu Flow Academy',
  description: 'Role-based, click-by-click Setu Flow CRM training for owners and salespeople working buyer leads from capture through quote and order.',
  alternates: { canonical: 'https://www.setuflowcrm.com/academy/day-in-life' },
};

export default function DayInLifePage() {
  return <DayInLifeBuyerLeads />;
}
