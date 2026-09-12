import type { ReactNode } from 'react';
import { SETU_MAIL_APP_METADATA } from '@/lib/setu-mail-app-metadata';

export const metadata = SETU_MAIL_APP_METADATA;

export default function ContactsRouteLayout({ children }: { children: ReactNode }) {
  return children;
}
