import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return <RouteLoadingState eyebrow="Admin" title="Loading workspace users" description="Preparing people, invitations, roles, and status controls." />;
}
