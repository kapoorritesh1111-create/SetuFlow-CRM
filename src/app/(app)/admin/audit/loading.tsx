import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return <RouteLoadingState eyebrow="Admin" title="Loading audit log" description="Preparing filter state, access-sensitive summaries, audit visibility, and recoverable failure guidance." />;
}
