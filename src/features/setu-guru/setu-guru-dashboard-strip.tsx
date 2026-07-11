import Link from 'next/link';
import { ArrowRight, TriangleAlert } from 'lucide-react';

import { SetuGuruDashboardPopover } from '@/features/setu-guru/setu-guru-dashboard-popover';
import { getGrowthCenterRecommendations, type SetuGuruRecommendation } from '@/lib/setu-guru/recommendations';

const priorityRank: Record<SetuGuruRecommendation['priority'], number> = { urgent: 4, high: 3, medium: 2, low: 1 };

function selectDiverseTopRecommendations(items: SetuGuruRecommendation[]) {
  const ordered = [...items].sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || Date.parse(b.created_at) - Date.parse(a.created_at));
  const selected: SetuGuruRecommendation[] = [];
  const usedTypes = new Set<string>();
  for (const item of ordered) {
    if (usedTypes.has(item.recommendation_type)) continue;
    selected.push(item);
    usedTypes.add(item.recommendation_type);
    if (selected.length === 3) return selected;
  }
  for (const item of ordered) {
    if (selected.some((selectedItem) => selectedItem.id === item.id)) continue;
    selected.push(item);
    if (selected.length === 3) break;
  }
  return selected;
}

export async function SetuGuruDashboardStrip({ organizationId }: { organizationId: string }) {
  try {
    const recommendations = await getGrowthCenterRecommendations(organizationId);
    const topRecommendations = selectDiverseTopRecommendations(recommendations.open);
    const urgentCount = recommendations.open.filter((item) => item.priority === 'urgent').length;
    const importantCount = recommendations.open.filter((item) => item.priority === 'high').length;
    return <SetuGuruDashboardPopover recommendations={topRecommendations} totalOpen={recommendations.open.length} urgentCount={urgentCount} importantCount={importantCount} />;
  } catch (error) {
    console.error('[setu-guru-dashboard] recommendations unavailable', { organizationId, error: error instanceof Error ? error.message : String(error) });
    return <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-4 py-3"><div className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-warning-fg" aria-hidden="true" /><p className="text-sm text-content-secondary">Today’s brief is temporarily unavailable.</p></div><Link href="/growth-agent" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">Open Growth Center<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>;
  }
}

export function SetuGuruDashboardStripLoading() {
  return <div className="mb-4 h-14 animate-pulse rounded-card border border-line bg-surface-2" aria-label="Loading Setu Guru recommendations" />;
}
