import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, Sparkles } from 'lucide-react';

export type GrowthRecommendation = {
  id: string;
  title: string;
  summary: string;
  recommendedAction: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  href?: string;
};

const priorityLabel: Record<GrowthRecommendation['priority'], string> = {
  low: 'Low priority',
  medium: 'Medium priority',
  high: 'High priority',
  urgent: 'Urgent',
};

export function RecommendationCard({ recommendation }: { recommendation: GrowthRecommendation }) {
  const content = (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-teal-50 p-2.5 text-teal-700">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-950">{recommendation.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{recommendation.summary}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {priorityLabel[recommendation.priority]}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Clock3 className="h-4 w-4 text-teal-600" aria-hidden="true" />
          {recommendation.recommendedAction}
        </div>
        {recommendation.href ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 group-hover:text-teal-800">
            Take action <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> User approval required
          </span>
        )}
      </div>
    </article>
  );

  return recommendation.href ? <Link href={recommendation.href}>{content}</Link> : content;
}
