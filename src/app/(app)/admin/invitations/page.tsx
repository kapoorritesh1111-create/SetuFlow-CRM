import { redirect } from 'next/navigation';

/**
 * S24-ADMUX-23 — Invitations merged into the tabbed Members & Roles page.
 * This route stays alive for deep links and existing return_path values.
 */
export default function AdminInvitationsPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const notice = typeof searchParams?.notice === 'string' ? `&notice=${encodeURIComponent(searchParams.notice)}` : '';
  redirect(`/admin/users?tab=invites${notice}`);
}
