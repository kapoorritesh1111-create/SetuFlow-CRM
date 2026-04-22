import { EmptyState } from '@/components/ui/empty-state';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { SettingsListsManager } from '@/features/settings/components/settings-lists-manager';
import { getSettingsListsData } from '@/lib/queries/settings-lists';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { ToolbarStat, WorkspaceHeader, WorkspaceToolbar } from '@/components/ui/workspace-toolbar';

type MarketRow = { id: string; name: string; market_code: string | null; sort_order: number | null; is_active: boolean };
type CountryRow = { id: string; name: string; iso2_code: string | null; iso3_code: string | null; phone_code: string | null; market_id: string | null; sort_order: number | null; is_active: boolean };
type NextStepRow = { id: string; name: string; sort_order: number | null; is_active: boolean };
type ProductCategoryRow = { id: string; name: string; sort_order: number | null; is_active: boolean; parent_id?: string | null };
type PipelineRow = { id: string; name: string; lead_type: string };
type StageRow = { id: string; name: string };

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div
              key={`${title}-${item}`}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
            >
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No items available.</p>
        )}
      </div>
    </section>
  );
}

export default async function SettingsListsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const workspace = await getWorkspaceAccess();

  if (!workspace.membership || !workspace.organization) {
    return (
      <EmptyState
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Confirm the organization_members row is active for this user and points to the seeded workspace."
      />
    );
  }

  const canManageSettings = hasWorkspaceCapability(workspace.currentRoles, 'settings.manage');
  if (!canManageSettings) {
    return (
      <WorkspaceState
        eyebrow="Settings"
        title="Settings access is restricted"
        description={
          getReadOnlyWorkspaceMessage(workspace.currentRoles, 'settings.manage') ??
          'Your current role cannot open reference data administration.'
        }
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to Overview"
        secondaryActionHref="/admin/organization"
        secondaryActionLabel="Review workspace roles"
      />
    );
  }

  const data = await getSettingsListsData(workspace.organization.id);

  if (!data) {
    return (
      <EmptyState
        title="Settings will appear here"
        description="Connect Supabase and your live settings reference tables will render in this workspace."
      />
    );
  }

  const markets: MarketRow[] = data.markets as MarketRow[];
  const countries: CountryRow[] = data.countries as CountryRow[];
  const nextSteps: NextStepRow[] = data.nextSteps as NextStepRow[];
  const productCategories: ProductCategoryRow[] = data.categories as ProductCategoryRow[];
  const pipelines: PipelineRow[] = data.pipelines as PipelineRow[];
  const stages: StageRow[] = data.stages as StageRow[];
  const isWorkspaceEmpty =
    markets.length === 0 &&
    countries.length === 0 &&
    nextSteps.length === 0 &&
    productCategories.length === 0;
  const totalLists = markets.length + countries.length + nextSteps.length + productCategories.length;
  const blockerSummary = isWorkspaceEmpty
    ? 'No reference rows exist yet.'
    : !markets.length
      ? 'Markets still need setup.'
      : !countries.length
        ? 'Countries still need setup.'
        : !nextSteps.length
          ? 'Next steps still need setup.'
          : 'No critical blocker in reference data; jump straight into the list you need.';
  const tabParam = typeof searchParams?.tab === 'string' ? searchParams.tab : null;
  const initialFocus =
    tabParam === 'countries'
      ? 'countries'
      : tabParam === 'next-steps'
        ? 'next_steps'
        : tabParam === 'product-categories'
          ? 'product_categories'
          : 'markets';
  const primarySetupHref = !markets.length
    ? '/settings/lists?tab=markets'
    : !countries.length
      ? '/settings/lists?tab=countries'
      : !nextSteps.length
        ? '/settings/lists?tab=next-steps'
        : '/settings/lists?tab=markets';
  const primarySetupLabel = !markets.length
    ? 'Start with markets'
    : !countries.length
      ? 'Add countries'
      : !nextSteps.length
        ? 'Add next steps'
        : 'Edit one list';

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Settings"
        title="Reference settings and defaults"
        description={`Where am I: settings lists. What is blocking me: ${blockerSummary} What do I do next: ${primarySetupLabel.toLowerCase()} and leave the rest alone.`}
        badge={workspace.organization.name}
        actions={
          <>
            <a href={primarySetupHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">{primarySetupLabel}</a>
            <a href="/admin/organization" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open Admin</a>
          </>
        }
        meta={
          <>
            <ToolbarStat label="Reference rows" value={String(totalLists)} />
            <ToolbarStat label="Markets" value={String(markets.length)} tone={markets.length ? 'default' : 'warning'} />
            <ToolbarStat label="Countries" value={String(countries.length)} tone={countries.length ? 'default' : 'warning'} />
            <ToolbarStat label="Next steps" value={String(nextSteps.length)} tone={nextSteps.length ? 'default' : 'warning'} />
          </>
        }
      />
      <WorkspaceToolbar
        actionSlot={
          <div className="flex flex-wrap gap-2">
            <a href={primarySetupHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Review primary setup lane</a>
          </div>
        }
        metaSlot={
          <div className="flex flex-wrap gap-2">
            <ToolbarStat label={blockerSummary} tone={isWorkspaceEmpty || !markets.length || !countries.length || !nextSteps.length ? 'warning' : 'success'} />
            <ToolbarStat label="One safe edit at a time" tone="info" />
          </div>
        }
      />
      <QueryIssuesAlert issues={data.queryIssues} />
      <SettingsListsManager
        markets={markets}
        countries={countries}
        nextSteps={nextSteps}
        productCategories={productCategories}
        marketOptions={markets.map((market) => ({ id: market.id, name: market.name }))}
        isWorkspaceEmpty={isWorkspaceEmpty}
        initialFocus={initialFocus}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard title="Pipelines" items={pipelines.map((item) => `${item.name} · ${item.lead_type}`)} />
        <ListCard title="Pipeline stages" items={stages.map((item) => item.name)} />
      </div>
    </div>
  );
}
