import Link from 'next/link';
import { TrialCapturePanel } from '@/features/trade-events/components/trial-capture-panel';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { requireWorkspace } from '@/lib/workspace/auth';
import { WorkspaceState } from '@/components/ui/workspace-state';

type TradeEventOptionRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  starts_on: string | null;
  ends_on: string | null;
};

type TradeEventTermRow = {
  id: string;
  kind: 'product' | 'category';
  display_term: string;
  usage_count: number;
};

type TradeEventOptionQuery = {
  select: (columns: string) => {
    eq: (column: 'organization_id', value: string) => {
      order: (column: 'starts_on', options: { ascending: boolean; nullsFirst: boolean }) => Promise<{ data: TradeEventOptionRow[] | null; error: { message?: string } | null }>;
    };
  };
};

type TradeEventTermQuery = {
  select: (columns: string) => {
    eq: (column: 'organization_id', value: string) => {
      order: (column: 'last_used_at', options: { ascending: boolean }) => {
        limit: (count: number) => Promise<{ data: TradeEventTermRow[] | null; error: { message?: string } | null }>;
      };
    };
  };
};

type CapturePageDb = {
  from: (table: 'trade_events') => TradeEventOptionQuery;
} & {
  from: (table: 'trade_event_terms') => TradeEventTermQuery;
};

function formatEventDateLabel(startsOn: string | null, endsOn: string | null) {
  if (!startsOn && !endsOn) return 'Dates not set';
  if (startsOn && !endsOn) return formatDate(startsOn);
  if (!startsOn && endsOn) return formatDate(endsOn);
  if (startsOn === endsOn) return formatDate(startsOn);
  return `${formatDate(startsOn)} – ${formatDate(endsOn)}`;
}

export default async function TradeEventsCapturePage() {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Trade event capture"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization_members row is active for this user and points to the seeded workspace."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const supabase = await createClient();
  const db = supabase as unknown as CapturePageDb;
  const { data: eventRows, error } = await db
    .from('trade_events')
    .select('id, name, city, country, starts_on, ends_on')
    .eq('organization_id', workspace.organization.id)
    .order('starts_on', { ascending: true, nullsFirst: false });

  const { data: termRows, error: termsError } = await db
    .from('trade_event_terms')
    .select('id, kind, display_term, usage_count')
    .eq('organization_id', workspace.organization.id)
    .order('last_used_at', { ascending: false })
    .limit(24);

  const events = (eventRows ?? []).map((event) => ({
    id: event.id,
    name: event.name,
    locationLabel: [event.city, event.country].filter(Boolean).join(', ') || 'Location TBD',
    dateLabel: formatEventDateLabel(event.starts_on, event.ends_on),
  }));

  const reusableTerms = (termRows ?? []).map((term) => ({
    id: term.id,
    kind: term.kind,
    displayTerm: term.display_term,
    usageCount: term.usage_count,
  }));

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Trade event entries</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Type, Dictate, or Scan Capture</h1>
          <p className="mt-1 text-sm font-medium text-slate-600">Entries stay separate from CRM leads. Product and category terms are saved for fast reuse.</p>
        </div>
        <Link href="/trade-events" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100">Back to workspace</Link>
      </div>

      {error?.message ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Trade events could not be loaded: {error.message}</div>
      ) : null}
      {termsError?.message ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Saved product/category terms could not be loaded: {termsError.message}</div>
      ) : null}

      <TrialCapturePanel events={events} reusableTerms={reusableTerms} />
    </div>
  );
}
