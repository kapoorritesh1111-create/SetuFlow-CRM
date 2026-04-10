import { RouteLoadingState } from '@/components/app/route-loading-state';

export default function Loading() {
  return (
    <RouteLoadingState
      eyebrow="Quote workspace"
      title="Loading quote workspace"
      description="Preparing pricing context, RFQ linkage, permissions, and quote workflow data for this lead."
    />
  );
}
