'use client';

import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { AppShell } from './app-shell';
import { MailProductShell } from './mail-product-shell';

type Props = ComponentProps<typeof AppShell>;

export function AuthenticatedShellRouter(props: Props) {
  const pathname = usePathname();
  const communicationsRoute = pathname === '/mail' || pathname.startsWith('/mail/') || pathname === '/calendar' || pathname.startsWith('/calendar/') || pathname === '/contacts' || pathname.startsWith('/contacts/');
  if (communicationsRoute) {
    const profileName = props.profile?.full_name ?? props.profile?.username ?? 'Setu Communications user';
    const profileEmail = props.profile?.email ?? '';
    return (
      <MailProductShell
        profileName={profileName}
        profileEmail={profileEmail}
        avatarUrl={props.profile?.avatar_url}
        organizationName={props.organization?.name ?? 'Setu Flow'}
      >
        {props.children}
      </MailProductShell>
    );
  }
  return <AppShell {...props} />;
}
