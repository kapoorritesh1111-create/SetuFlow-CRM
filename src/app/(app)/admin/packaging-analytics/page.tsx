import { redirect } from 'next/navigation';

/**
 * S27-STARK-IA-01 — Packaging Analytics moved out of the (mostly-hidden,
 * owner/admin-only) Admin area and into Dashboard -> Analytics, where the
 * rest of the org's analytics already lives and where non-admin roles can
 * actually find it. This route now just forwards any old links/bookmarks.
 */
export default function PackagingAnalyticsRedirect() {
  redirect('/dashboard/analytics');
}
