'use client';

import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { AppShell } from './app-shell';
import { MailProductShell } from './mail-product-shell';

type Props = ComponentProps<typeof AppShell>;

export function AuthenticatedShellRouter(props: Props) {
  const pathname = usePathname();
  if (pathname === '/mail' || pathname.startsWith('/mail/')) {
    const profileName = props.profile?.full_name ?? props.profile?.username ?? 'Setu Mail user';
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
