import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return <RouteLoadingState eyebrow="Admin" title="Loading invitations" description="Preparing invite queue health, resend and revoke controls, and cross-links back to users and audit." />;
}
