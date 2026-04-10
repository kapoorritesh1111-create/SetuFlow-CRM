import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return <RouteLoadingState eyebrow="Workspace" title="Loading ai suggestions" description="Preparing live data, permissions, and operator surfaces for this workspace." />;
}
