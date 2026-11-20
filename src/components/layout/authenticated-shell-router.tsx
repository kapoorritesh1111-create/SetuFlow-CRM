'use client';

import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { AppShell } from './app-shell';
import { MailProductShell } from './mail-product-shell';
import { StarkSalesShell } from './stark-sales-shell';

type Props = ComponentProps<typeof AppShell>;

export function AuthenticatedShellRouter(props: Props) {
  const pathname = usePathname();
  const starkRoute=pathname==='/leads'||pathname.startsWith('/leads/')||pathname==='/quotes'||pathname.startsWith('/quotes/');
  if(props.organizationId==='b97913cb-3b95-4247-8ced-ffdc0d392d2a' && starkRoute){
    return <StarkSalesShell profile={props.profile} currentRoles={props.currentRoles} organizationId={props.organizationId} userId={props.userId}>{props.children}</StarkSalesShell>;
  }
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
        organizationId={props.organizationId ?? props.organization?.id ?? undefined}
        userId={props.userId ?? props.profile?.id ?? undefined}
      >
        {props.children}
      </MailProductShell>
    );
  }
  return <AppShell {...props} />;
}
