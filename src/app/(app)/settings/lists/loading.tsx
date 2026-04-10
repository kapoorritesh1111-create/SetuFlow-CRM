import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return (
    <RouteLoadingState
      eyebrow="Settings lists"
      title="Loading settings lists"
      description="Preparing reference data, permissions, and import-export controls for this workspace."
    />
  );
}
