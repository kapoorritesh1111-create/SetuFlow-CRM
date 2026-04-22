import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return <RouteLoadingState eyebrow="Workspace" title="Loading approvals & sending" description="Preparing live data, permissions, and sending tools for this workspace." />;
}
