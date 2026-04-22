import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return <RouteLoadingState eyebrow="Quote" title="Loading quote workspace" description="Preparing pricing, approval status, and quote history for the active workspace." />;
}
