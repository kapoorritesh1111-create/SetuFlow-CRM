import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return <RouteLoadingState eyebrow="Admin" title="Loading workspace users" description="Preparing access controls, admin-view safeguards, invitation state, and audit links for the users workspace." />;
}
