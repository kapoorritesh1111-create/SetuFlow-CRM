'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  deleteSettingsListItem,
  importSettingsListsSnapshot,
  saveSettingsListItem,
} from '@/features/settings/server/actions';
import SettingsListRow from './SettingsListRow';
import SettingsListSection from './SettingsListSection';
import SettingsSectionEmptyState from './SettingsSectionEmptyState';
import RightDrawer, { DrawerActionBar, DrawerSection } from '@/components/RightDrawer';
import { checkboxClassName } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { ToolbarActionButton, ToolbarStat } from '@/components/ui/workspace-toolbar';
import { AICompactActionBrief } from '@/features/ai/ui/intelligence-panels';

type BaseItem = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
};

type Market = BaseItem & {
  market_code: string | null;
};

type Country = BaseItem & {
  iso2_code: string | null;
  iso3_code: string | null;
  phone_code: string | null;
  market_id: string | null;
};

type NextStep = BaseItem;
type ProductCategory = BaseItem & { parent_id?: string | null };

type MarketOption = {
  id: string;
  name: string;
};

type Props = {
  markets: Market[];
  countries: Country[];
  nextSteps: NextStep[];
  productCategories: ProductCategory[];
  marketOptions: MarketOption[];
  isWorkspaceEmpty?: boolean;
  initialFocus?: TableName | null;
};

type TableName = 'markets' | 'countries' | 'next_steps' | 'product_categories';

type SettingsExportSnapshot = {
  version: number;
  exported_at: string;
  markets: Market[];
  countries: Country[];
  next_steps: NextStep[];
  product_categories: ProductCategory[];
};

export function SettingsListsManager({
  markets,
  countries,
  nextSteps,
  productCategories,
  marketOptions,
  isWorkspaceEmpty = false,
  initialFocus = null,
}: Props) {
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'default' | 'danger'>('default');
  const [isPending, startTransition] = useTransition();
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const [marketSearch, setMarketSearch] = useState('');
  const [showInactiveMarkets, setShowInactiveMarkets] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showInactiveCountries, setShowInactiveCountries] = useState(false);
  const [nextStepSearch, setNextStepSearch] = useState('');
  const [showInactiveNextSteps, setShowInactiveNextSteps] = useState(false);
  const [productCategorySearch, setProductCategorySearch] = useState('');
  const [showInactiveProductCategories, setShowInactiveProductCategories] = useState(false);

  const [expandedMarkets, setExpandedMarkets] = useState(true);
  const [expandedCountries, setExpandedCountries] = useState(false);
  const [expandedNextSteps, setExpandedNextSteps] = useState(false);
  const [expandedProductCategories, setExpandedProductCategories] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedFiltersStr = window.localStorage.getItem('settingsFilters');
      if (savedFiltersStr) {
        const savedFilters = JSON.parse(savedFiltersStr);
        setMarketSearch(savedFilters.marketSearch ?? '');
        setShowInactiveMarkets(savedFilters.showInactiveMarkets ?? false);
        setCountrySearch(savedFilters.countrySearch ?? '');
        setShowInactiveCountries(savedFilters.showInactiveCountries ?? false);
        setNextStepSearch(savedFilters.nextStepSearch ?? '');
        setShowInactiveNextSteps(savedFilters.showInactiveNextSteps ?? false);
        setProductCategorySearch(savedFilters.productCategorySearch ?? '');
        setShowInactiveProductCategories(savedFilters.showInactiveProductCategories ?? false);
      }
      const savedExpandedStr = window.localStorage.getItem('settingsExpandedSections');
      if (savedExpandedStr) {
        const savedExpanded = JSON.parse(savedExpandedStr);
        setExpandedMarkets(savedExpanded.expandedMarkets ?? true);
        setExpandedCountries(savedExpanded.expandedCountries ?? false);
        setExpandedNextSteps(savedExpanded.expandedNextSteps ?? false);
        setExpandedProductCategories(savedExpanded.expandedProductCategories ?? false);
      }
    } catch {
      // ignore local storage parsing issues
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'settingsFilters',
        JSON.stringify({
          marketSearch,
          showInactiveMarkets,
          countrySearch,
          showInactiveCountries,
          nextStepSearch,
          showInactiveNextSteps,
          productCategorySearch,
          showInactiveProductCategories,
        }),
      );
    } catch {
      // ignore storage issues
    }
  }, [
    marketSearch,
    showInactiveMarkets,
    countrySearch,
    showInactiveCountries,
    nextStepSearch,
    showInactiveNextSteps,
    productCategorySearch,
    showInactiveProductCategories,
  ]);


  useEffect(() => {
    if (!initialFocus) return;
    setExpandedMarkets(initialFocus === 'markets');
    setExpandedCountries(initialFocus === 'countries');
    setExpandedNextSteps(initialFocus === 'next_steps');
    setExpandedProductCategories(initialFocus === 'product_categories');
  }, [initialFocus]);

  const focusSection = (table: TableName) => {
    setExpandedMarkets(table === 'markets');
    setExpandedCountries(table === 'countries');
    setExpandedNextSteps(table === 'next_steps');
    setExpandedProductCategories(table === 'product_categories');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'settingsExpandedSections',
        JSON.stringify({
          expandedMarkets,
          expandedCountries,
          expandedNextSteps,
          expandedProductCategories,
        }),
      );
    } catch {
      // ignore storage issues
    }
  }, [expandedMarkets, expandedCountries, expandedNextSteps, expandedProductCategories]);

  const filteredMarkets = useMemo(
    () =>
      markets.filter((item) => {
        const q = marketSearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCode = (item.market_code ?? '').toLowerCase().includes(q);
        const isActiveAllowed = showInactiveMarkets || item.is_active;
        return (matchesName || matchesCode) && isActiveAllowed;
      }),
    [markets, marketSearch, showInactiveMarkets],
  );

  const filteredCountries = useMemo(
    () =>
      countries.filter((item) => {
        const q = countrySearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesIso2 = (item.iso2_code ?? '').toLowerCase().includes(q);
        const matchesIso3 = (item.iso3_code ?? '').toLowerCase().includes(q);
        const matchesPhone = (item.phone_code ?? '').toLowerCase().includes(q);
        const isActiveAllowed = showInactiveCountries || item.is_active;
        return (matchesName || matchesIso2 || matchesIso3 || matchesPhone) && isActiveAllowed;
      }),
    [countries, countrySearch, showInactiveCountries],
  );

  const filteredNextSteps = useMemo(
    () =>
      nextSteps.filter((item) => {
        const q = nextStepSearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const isActiveAllowed = showInactiveNextSteps || item.is_active;
        return matchesName && isActiveAllowed;
      }),
    [nextSteps, nextStepSearch, showInactiveNextSteps],
  );

  const filteredProductCategories = useMemo(
    () =>
      productCategories.filter((item) => {
        const q = productCategorySearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const isActiveAllowed = showInactiveProductCategories || item.is_active;
        return matchesName && isActiveAllowed;
      }),
    [productCategories, productCategorySearch, showInactiveProductCategories],
  );

  const exportSnapshot: SettingsExportSnapshot = useMemo(
    () => ({
      version: 1,
      exported_at: new Date().toISOString(),
      markets,
      countries,
      next_steps: nextSteps,
      product_categories: productCategories,
    }),
    [markets, countries, nextSteps, productCategories],
  );

  const totalReferenceItems = markets.length + countries.length + nextSteps.length + productCategories.length;
  const activeReferenceItems = markets.filter((item) => item.is_active).length + countries.filter((item) => item.is_active).length + nextSteps.filter((item) => item.is_active).length + productCategories.filter((item) => item.is_active).length;
  const blockerSummary = isWorkspaceEmpty
    ? 'No reference lists yet. Start with a market or import a JSON snapshot.'
    : !markets.length
      ? 'Markets are still missing, so downstream geography defaults stay weak.'
      : !countries.length
        ? 'Countries are still missing, so market coverage is incomplete.'
        : !nextSteps.length
          ? 'Next steps are missing, so follow-up defaults remain thin.'
          : 'Reference lists are live. Focus the section you want and edit without scanning the whole page.';

  const settingsAiWhere = isWorkspaceEmpty
    ? 'Settings lists are empty.'
    : `${activeReferenceItems} of ${totalReferenceItems} reference items are active across markets, countries, next steps, and categories.`;
  const settingsAiBlocker = isWorkspaceEmpty
    ? 'No shared reference data exists yet.'
    : !markets.length
      ? 'Markets are missing, so geography defaults stay weak downstream.'
      : !countries.length
        ? 'Countries are missing, so market coverage is incomplete.'
        : !nextSteps.length
          ? 'Next steps are missing, so follow-up defaults remain thin.'
          : 'The lists are live; the main risk is too much reading, not missing setup proof.';
  const settingsAiNextAction = isWorkspaceEmpty
    ? 'Create the first market or import a JSON snapshot before editing anything else.'
    : !markets.length
      ? 'Add a market first, then fill country coverage under it.'
      : !countries.length
        ? 'Add countries next so downstream geography stays explainable.'
        : !nextSteps.length
          ? 'Add next steps so follow-up defaults are ready to use.'
          : 'Jump to the one section you need, edit it, and leave the rest collapsed.';

  const primaryFocusTable: TableName = isWorkspaceEmpty || !markets.length
    ? 'markets'
    : !countries.length
      ? 'countries'
      : !nextSteps.length
        ? 'next_steps'
        : 'markets';
  const primaryFocusLabel = isWorkspaceEmpty || !markets.length
    ? 'Start with markets'
    : !countries.length
      ? 'Add countries'
      : !nextSteps.length
        ? 'Add next steps'
        : 'Edit markets';

  const showActionMessage = (nextMessage: string, tone: 'default' | 'danger' = 'default') => {
    setMessage(nextMessage);
    setMessageTone(tone);
  };

  const handleSave = (formData: FormData) => {
    startTransition(() => {
      void saveSettingsListItem(undefined, formData).then((result) => {
        if (result?.error) showActionMessage(result.error, 'danger');
        else showActionMessage(result?.success ?? 'Settings item saved.');
        if (!result?.error) closeDrawer();
      });
    });
  };

  const handleDelete = (formData: FormData) => {
    startTransition(() => {
      void deleteSettingsListItem(undefined, formData).then((result) => {
        if (result?.error) showActionMessage(result.error, 'danger');
        else showActionMessage(result?.success ?? 'Settings item deleted.');
      });
    });
  };

  const handleExport = () => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([JSON.stringify(exportSnapshot, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    const dateStamp = exportSnapshot.exported_at.slice(0, 10);
    link.href = url;
    link.download = `settings-lists-${dateStamp}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    showActionMessage('Settings lists exported as JSON. Store the file before making bulk changes.');
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    const raw = await file.text();
    const formData = new FormData();
    formData.set('snapshot', raw);
    startTransition(() => {
      void importSettingsListsSnapshot(undefined, formData).then((result) => {
        if (result?.error) showActionMessage(result.error, 'danger');
        else showActionMessage(result?.success ?? 'Settings snapshot imported.');
        if (importFileRef.current) importFileRef.current.value = '';
      });
    });
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTable, setDrawerTable] = useState<TableName | undefined>(undefined);
  const [drawerItem, setDrawerItem] = useState<Market | Country | NextStep | ProductCategory | undefined>(undefined);

  const tableLabels: Record<TableName, string> = {
    markets: 'Market',
    countries: 'Country',
    next_steps: 'Next step',
    product_categories: 'Category',
  };

  const openAddDrawer = (table: TableName) => {
    setDrawerTable(table);
    setDrawerItem(undefined);
    setDrawerOpen(true);
  };

  const openEditDrawer = (table: TableName, item: Market | Country | NextStep | ProductCategory) => {
    setDrawerTable(table);
    setDrawerItem(item);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerTable(undefined);
    setDrawerItem(undefined);
  };

  const renderDrawerFields = () => {
    if (!drawerTable) return null;
    switch (drawerTable) {
      case 'markets': {
        const item = drawerItem as Market | undefined;
        return (
          <>
            <input type="hidden" name="id" defaultValue={item?.id ?? ''} />
            <input name="name" placeholder="Market name" defaultValue={item?.name ?? ''} required />
            <input name="market_code" placeholder="Market code" defaultValue={item?.market_code ?? ''} />
            <input type="number" name="sort_order" placeholder="Sort order" defaultValue={item?.sort_order ?? 0} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className={checkboxClassName()} name="is_active" defaultChecked={item?.is_active ?? true} /> Active
            </label>
          </>
        );
      }
      case 'countries': {
        const item = drawerItem as Country | undefined;
        return (
          <>
            <input type="hidden" name="id" defaultValue={item?.id ?? ''} />
            <input name="name" placeholder="Country name" defaultValue={item?.name ?? ''} required />
            <input name="iso2_code" placeholder="ISO2 code" defaultValue={item?.iso2_code ?? ''} />
            <input name="iso3_code" placeholder="ISO3 code" defaultValue={item?.iso3_code ?? ''} />
            <input name="phone_code" placeholder="Phone code" defaultValue={item?.phone_code ?? ''} />
            <select name="market_id" defaultValue={item?.market_id ?? ''}>
              <option value="">No market selected</option>
              {marketOptions.map((market) => (
                <option key={`country-market-${market.id}`} value={market.id}>
                  {market.name}
                </option>
              ))}
            </select>
            <input type="number" name="sort_order" placeholder="Sort order" defaultValue={item?.sort_order ?? 0} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className={checkboxClassName()} name="is_active" defaultChecked={item?.is_active ?? true} /> Active
            </label>
          </>
        );
      }
      case 'next_steps': {
        const item = drawerItem as NextStep | undefined;
        return (
          <>
            <input type="hidden" name="id" defaultValue={item?.id ?? ''} />
            <input name="name" placeholder="Next step name" defaultValue={item?.name ?? ''} required />
            <input type="number" name="sort_order" placeholder="Sort order" defaultValue={item?.sort_order ?? 0} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className={checkboxClassName()} name="is_active" defaultChecked={item?.is_active ?? true} /> Active
            </label>
          </>
        );
      }
      case 'product_categories': {
        const item = drawerItem as ProductCategory | undefined;
        return (
          <>
            <input type="hidden" name="id" defaultValue={item?.id ?? ''} />
            <input name="name" placeholder="Category name" defaultValue={item?.name ?? ''} required />
            <select name="parent_id" defaultValue={item?.parent_id ?? ''}>
              <option value="">No parent</option>
              {productCategories.map((category) => (
                <option key={`cat-${category.id}`} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input type="number" name="sort_order" placeholder="Sort order" defaultValue={item?.sort_order ?? 0} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className={checkboxClassName()} name="is_active" defaultChecked={item?.is_active ?? true} /> Active
            </label>
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-brand-200 bg-brand-50/70 p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Action-first settings lane</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Keep setup controlled without making the team scan the whole page</h3>
            <p className="mt-2 text-sm text-slate-600">Where am I: reference lists. What is blocking me: {blockerSummary} What do I do next: {primaryFocusLabel.toLowerCase()} and keep the rest collapsed.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToolbarStat label={`${activeReferenceItems} active rows`} />
              <ToolbarStat label={`${totalReferenceItems} total rows`} tone="info" />
              {isWorkspaceEmpty ? <ToolbarStat label="First-time setup" tone="warning" /> : null}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToolbarActionButton type="button" onClick={() => focusSection(primaryFocusTable)}>{primaryFocusLabel}</ToolbarActionButton>
            <ToolbarActionButton type="button" onClick={() => focusSection('countries')}>Countries</ToolbarActionButton>
            <ToolbarActionButton type="button" onClick={() => focusSection('next_steps')}>Next steps</ToolbarActionButton>
            <ToolbarActionButton type="button" onClick={() => focusSection('product_categories')}>Categories</ToolbarActionButton>
          </div>
        </div>
      </section>

      <AICompactActionBrief
        lane="Settings / Admin"
        where={settingsAiWhere}
        blocker={settingsAiBlocker}
        nextAction={settingsAiNextAction}
        guardrail="AI can compress setup posture and the next safe edit. It cannot change lists, bypass schema rules, or create hidden defaults."
        details={[
          blockerSummary,
          `${markets.length} markets · ${countries.length} countries · ${nextSteps.length} next steps · ${productCategories.length} categories`,
        ]}
        tone={isWorkspaceEmpty || !markets.length || !countries.length || !nextSteps.length ? 'warning' : 'neutral'}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Import and export</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Reference data safety rail</h3>
            <p className="mt-2 text-sm text-slate-600">
              Export the current settings snapshot before bulk edits, then import the same JSON format to restore or migrate list values.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToolbarStat label={`${totalReferenceItems} reference rows`} />
              <ToolbarStat label="JSON snapshot flow" tone="info" />
              {isWorkspaceEmpty ? <ToolbarStat label="First-time workspace" tone="warning" /> : null}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ToolbarActionButton type="button" onClick={handleExport} disabled={isPending}>
              Export settings JSON
            </ToolbarActionButton>
            <ToolbarActionButton
              type="button"
              tone="primary"
              onClick={() => importFileRef.current?.click()}
              disabled={isPending}
            >
              {isPending ? 'Working…' : 'Import settings JSON'}
            </ToolbarActionButton>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] ?? null;
                void handleImportFile(file);
              }}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Empty-state coverage</p>
            <p className="mt-1">Each list section stays usable even when no rows exist, so first-time setup can begin without hidden controls.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Recoverable import path</p>
            <p className="mt-1">Import is non-destructive and returns inline feedback. Fix the file and retry instead of losing the screen state.</p>
          </div>
        </div>
      </section>

      {message ? (
        <div
          className={[
            'rounded-2xl px-4 py-3 text-sm shadow-sm',
            messageTone === 'danger'
              ? 'border border-rose-200 bg-rose-50 text-rose-700'
              : 'border border-slate-200 bg-white text-slate-700',
          ].join(' ')}
        >
          {message}
        </div>
      ) : null}

      {isWorkspaceEmpty ? (
        <EmptyState
          title="This workspace has no settings lists yet"
          description="Start by importing a JSON snapshot or create the first market, country, next step, or product category from the sections below."
        />
      ) : null}

      <SettingsListSection
        title="Markets"
        description="Maintain market master data used across countries and lead assignment."
        count={filteredMarkets.length}
        expanded={expandedMarkets}
        onToggle={() => setExpandedMarkets((value) => !value)}
        searchValue={marketSearch}
        onSearchChange={setMarketSearch}
        showInactive={showInactiveMarkets}
        onShowInactiveChange={setShowInactiveMarkets}
        addLabel="Add market"
        onAdd={() => openAddDrawer('markets')}
        emptyState={
          filteredMarkets.length === 0 ? <SettingsSectionEmptyState message="No markets found. Add your first market or import a settings snapshot." /> : null
        }
      >
        {filteredMarkets.map((item) => (
          <SettingsListRow
            key={item.id}
            title={item.name}
            subtitle={item.market_code || '—'}
            onEdit={() => openEditDrawer('markets', item)}
            onDelete={() => {
              const fd = new FormData();
              fd.append('table', 'markets');
              fd.append('id', item.id);
              handleDelete(fd);
            }}
            isPending={isPending}
          />
        ))}
      </SettingsListSection>

      <SettingsListSection
        title="Countries"
        description="Countries belong to markets and provide phone code reference values."
        count={filteredCountries.length}
        expanded={expandedCountries}
        onToggle={() => setExpandedCountries((value) => !value)}
        searchValue={countrySearch}
        onSearchChange={setCountrySearch}
        showInactive={showInactiveCountries}
        onShowInactiveChange={setShowInactiveCountries}
        addLabel="Add country"
        onAdd={() => openAddDrawer('countries')}
        emptyState={
          filteredCountries.length === 0 ? <SettingsSectionEmptyState message="No countries found. Add your first country or import a settings snapshot." /> : null
        }
      >
        {filteredCountries.map((item) => (
          <SettingsListRow
            key={item.id}
            title={item.name}
            subtitle={`${item.iso2_code || '—'} / ${item.iso3_code || '—'} / ${item.phone_code || '—'}`}
            onEdit={() => openEditDrawer('countries', item)}
            onDelete={() => {
              const fd = new FormData();
              fd.append('table', 'countries');
              fd.append('id', item.id);
              handleDelete(fd);
            }}
            isPending={isPending}
          />
        ))}
      </SettingsListSection>

      <SettingsListSection
        title="Next steps"
        description="Action labels used by leads and pipeline follow-up workflows."
        count={filteredNextSteps.length}
        expanded={expandedNextSteps}
        onToggle={() => setExpandedNextSteps((value) => !value)}
        searchValue={nextStepSearch}
        onSearchChange={setNextStepSearch}
        showInactive={showInactiveNextSteps}
        onShowInactiveChange={setShowInactiveNextSteps}
        addLabel="Add next step"
        onAdd={() => openAddDrawer('next_steps')}
        emptyState={
          filteredNextSteps.length === 0 ? <SettingsSectionEmptyState message="No next steps found. Create the first follow-up label or import a settings snapshot." /> : null
        }
      >
        {filteredNextSteps.map((item) => (
          <SettingsListRow
            key={item.id}
            title={item.name}
            subtitle={`Sort order: ${item.sort_order ?? 0}`}
            onEdit={() => openEditDrawer('next_steps', item)}
            onDelete={() => {
              const fd = new FormData();
              fd.append('table', 'next_steps');
              fd.append('id', item.id);
              handleDelete(fd);
            }}
            isPending={isPending}
          />
        ))}
      </SettingsListSection>

      <SettingsListSection
        title="Product categories"
        description="Catalog classification values used by products and reporting."
        count={filteredProductCategories.length}
        expanded={expandedProductCategories}
        onToggle={() => setExpandedProductCategories((value) => !value)}
        searchValue={productCategorySearch}
        onSearchChange={setProductCategorySearch}
        showInactive={showInactiveProductCategories}
        onShowInactiveChange={setShowInactiveProductCategories}
        addLabel="Add category"
        onAdd={() => openAddDrawer('product_categories')}
        emptyState={
          filteredProductCategories.length === 0 ? <SettingsSectionEmptyState message="No categories found. Add your first category or import a settings snapshot." /> : null
        }
      >
        {filteredProductCategories.map((item) => {
          const parentName = productCategories.find((category) => category.id === item.parent_id)?.name ?? 'No parent';
          return (
            <SettingsListRow
              key={item.id}
              title={item.name}
              subtitle={`Parent: ${parentName}`}
              onEdit={() => openEditDrawer('product_categories', item)}
              onDelete={() => {
                const fd = new FormData();
                fd.append('table', 'product_categories');
                fd.append('id', item.id);
                handleDelete(fd);
              }}
              isPending={isPending}
            />
          );
        })}
      </SettingsListSection>

      <RightDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={`${drawerItem ? 'Edit' : 'Add'} ${drawerTable ? tableLabels[drawerTable] : ''}`}
        description="Manage reference data in a simple shared drawer."
        footer={
          <DrawerActionBar
            title={drawerItem ? 'Update reference item' : 'Create reference item'}
            description="Keep this list item updated without leaving the current settings page."
          >
            <button
              type="button"
              onClick={closeDrawer}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="settings-drawer-form"
              disabled={isPending}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isPending ? 'Saving…' : drawerItem ? 'Save changes' : 'Create'}
            </button>
          </DrawerActionBar>
        }
      >
        <form
          id="settings-drawer-form"
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            if (drawerTable) fd.set('table', drawerTable);
            if (drawerItem?.id) fd.set('id', drawerItem.id);
            handleSave(fd);
          }}
        >
          <DrawerSection
            title="Reference item details"
            description="Keep list maintenance inside the drawer with shared section framing and action placement."
          >
            <div className="grid gap-3">{renderDrawerFields()}</div>
          </DrawerSection>
        </form>
      </RightDrawer>
    </div>
  );
}
