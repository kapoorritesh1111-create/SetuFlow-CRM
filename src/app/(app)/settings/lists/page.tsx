import { EmptyState } from '@/components/ui/empty-state';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { SettingsListsManager } from '@/features/settings/components/settings-lists-manager';
import { getSettingsListsData } from '@/lib/queries/settings-lists';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { WorkspaceState } from '@/components/ui/workspace-state';

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

export default async function SettingsListsPage() {
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
        eyebrow="Settings lists"
        title="Settings list access is restricted"
        description={
          getReadOnlyWorkspaceMessage(workspace.currentRoles, 'settings.manage') ??
          'Your current role cannot open reference data administration.'
        }
        primaryActionHref="/dashboard"
        primaryActionLabel="Return to dashboard"
        secondaryActionHref="/admin/organization"
        secondaryActionLabel="Review workspace roles"
      />
    );
  }

  const data = await getSettingsListsData(workspace.organization.id);

  if (!data) {
    return (
      <EmptyState
        title="Settings lists will appear here"
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700">Settings lists</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Reference data administration</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Maintain organization-scoped master data used by leads, products, pipeline workflows, and reporting.
        </p>
      </div>
      <QueryIssuesAlert issues={data.queryIssues} />
      <SettingsListsManager
        markets={markets}
        countries={countries}
        nextSteps={nextSteps}
        productCategories={productCategories}
        marketOptions={markets.map((market) => ({ id: market.id, name: market.name }))}
        isWorkspaceEmpty={isWorkspaceEmpty}
      />
      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard title="Pipelines" items={pipelines.map((item) => `${item.name} · ${item.lead_type}`)} />
        <ListCard title="Pipeline stages" items={stages.map((item) => item.name)} />
      </div>
    </div>
  );
}
