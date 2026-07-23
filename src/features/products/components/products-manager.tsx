'use client';

import { useEffect, useMemo, useState } from 'react';

import RightDrawer from '@/components/RightDrawer';
import { CatalogImportExportWizard } from '@/features/products/components/catalog-import-export-wizard';
import { AuditHistoryDrawer } from '@/components/app/audit-history-drawer';
import type { AuditEventRecord } from '@/lib/auditLog';
import { EmptyState } from '@/components/ui/empty-state';
import { CommercialWizardFooter } from '@/components/ui/commercial-wizard-footer';
import {
  ToolbarActionButton,
  ToolbarField,
  ToolbarSearchInput,
  ToolbarSelect,
  ToolbarStat,
  WorkspaceToolbar,
} from '@/components/ui/workspace-toolbar';
import {
  WizardShell,
  WizardStepBody,
  WizardValidationSummary,
  type WizardStepDefinition,
} from '@/components/ui/wizard-shell';
import {
  deleteCatalogPrice,
  deleteProduct,
  distributeProductPricing,
  saveCatalogPrice,
  saveProduct,
} from '@/features/products/server/actions';
import type {
  ProductCategoryViewModel,
  ProductMarketPriceViewModel,
  ProductViewModel,
} from '@/features/products/view-model';

const ALL_MARKETS_VALUE = '__all__';
const PRODUCT_PAGE_SIZE = 24;
const PRODUCT_PAGE_SIZE_OPTIONS = [24, 48, 96] as const;
const PRODUCT_PRICING_PAGE_SIZE = 12;
const checkboxClassName =
  'h-5 w-5 rounded border border-slate-300 text-slate-900 accent-slate-900 focus:ring-2 focus:ring-slate-300';

type MarketOption = { id: string; name: string; isActive: boolean };
type WizardStepKey = 'basics' | 'details' | 'review';
type WorkspaceMode = 'products' | 'catalog';

type ProductDraft = {
  id: string;
  name: string;
  category_id: string;
  is_active: boolean;
  description: string;
  sku: string;
  sku_code: string;
  brand_name: string;
  pack_size: string;
  hsn_code: string;
  short_code: string;
  supplier_name: string;
  country_of_origin: string;
  export_metadata: string;
  packaging_type: string;
  packaging_unit: string;
  units_per_case: string;
  net_weight_kg: string;
  shipment_notes: string;
  pricing_mode_default: string;
};

type CatalogPricingDraft = {
  price_row_id: string;
  product_id: string;
  product_variant_id: string;
  variant_name: string;
  market_id: string;
  currency: string;
  amount: string;
  effective_from: string;
  effective_to: string;
};

const PRODUCT_WIZARD_STEPS: WizardStepDefinition[] = [
  {
    id: 'basics',
    title: 'Basics',
    shortLabel: 'Basics',
    description: 'Set the product name, category, and active status.',
  },
  {
    id: 'details',
    title: 'Details',
    shortLabel: 'Details',
    description: 'Capture SKU, supplier, and catalog reference details.',
  },
  {
    id: 'review',
    title: 'Review',
    shortLabel: 'Review',
    description: 'Review your updates before saving.',
  },
];

function createDraft(product?: ProductViewModel): ProductDraft {
  return {
    id: product?.id ?? '',
    name: product?.name ?? '',
    category_id: product?.categoryId ?? '',
    is_active: product?.isActive ?? true,
    description: product?.description ?? '',
    sku: product?.sku ?? '',
    sku_code: product?.skuCode ?? product?.sku ?? '',
    brand_name: product?.brandName ?? '',
    pack_size: product?.packSize ?? '',
    hsn_code: product?.hsnCode ?? '',
    short_code: product?.shortCode ?? '',
    supplier_name: product?.supplierName ?? '',
    country_of_origin: product?.tradeAttributes?.countryOfOrigin ?? '',
    export_metadata: product?.tradeAttributes?.exportMetadata ?? '',
    packaging_type: product?.tradeAttributes?.packagingType ?? product?.variants?.[0]?.packLabel ?? '',
    packaging_unit: product?.tradeAttributes?.packagingUnit ?? '',
    units_per_case: product?.tradeAttributes?.unitsPerCase != null ? String(product.tradeAttributes.unitsPerCase) : '',
    net_weight_kg: product?.tradeAttributes?.netWeightKg != null ? String(product.tradeAttributes.netWeightKg) : '',
    shipment_notes: product?.tradeAttributes?.shipmentNotes ?? '',
    pricing_mode_default: product?.tradeAttributes?.unitOfMeasure ?? product?.variants?.[0]?.unitOfMeasure ?? 'unit',
  };
}

function createCatalogPricingDraft(product?: ProductViewModel, row?: ProductMarketPriceViewModel): CatalogPricingDraft {
  const defaultVariant =
    (row ? product?.variants.find((variant) => variant.id === row.variantId) : undefined) ??
    product?.variants[0];

  return {
    price_row_id: row?.id ?? '',
    product_id: product?.id ?? '',
    product_variant_id: row?.variantId ?? defaultVariant?.id ?? '',
    variant_name: row?.variantName ?? defaultVariant?.name ?? product?.name ?? '',
    market_id: row?.marketId ?? '',
    currency: row?.currency ?? 'USD',
    amount: row?.price != null ? String(row.price) : '',
    effective_from: row?.effectiveFrom ?? '',
    effective_to: row?.effectiveTo ?? '',
  };
}

function normalizeDraft(draft: ProductDraft) {
  return JSON.stringify({
    ...draft,
    name: draft.name.trim(),
    category_id: draft.category_id.trim(),
    description: draft.description.trim(),
    sku: draft.sku.trim(),
    sku_code: draft.sku_code.trim(),
    brand_name: draft.brand_name.trim(),
    pack_size: draft.pack_size.trim(),
    hsn_code: draft.hsn_code.trim(),
    short_code: draft.short_code.trim(),
    supplier_name: draft.supplier_name.trim(),
    country_of_origin: draft.country_of_origin.trim(),
    export_metadata: draft.export_metadata.trim(),
    packaging_type: draft.packaging_type.trim(),
    packaging_unit: draft.packaging_unit.trim(),
    units_per_case: draft.units_per_case.trim(),
    net_weight_kg: draft.net_weight_kg.trim(),
    shipment_notes: draft.shipment_notes.trim(),
    pricing_mode_default: draft.pricing_mode_default.trim(),
  });
}

function formatMoney(value: number | null, currency: string | null) {
  if (value == null) return 'Quote-based';
  const amount = Number.isFinite(value) ? value.toFixed(2) : '0.00';
  return `${currency || 'USD'} ${amount}`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const trimmed = String(value).trim();
  if (!trimmed) return '—';
  const datePart = trimmed.includes('T') ? trimmed.split('T', 1)[0] : trimmed;
  const parts = datePart.split('-');
  if (parts.length !== 3) return datePart;
  const [year, month, day] = parts;
  return `${year}-${month}-${day}`;
}

function getStatusTone(isActive: boolean) {
  return isActive
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';
}

function getPricingTone(product: ProductViewModel) {
  return product.baselineStatus === 'covered'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : product.baselineStatus === 'partial'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';
}

function getRowStatusTone(status: ProductMarketPriceViewModel['status']) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'future') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function buildCategoryOptions(categories: ProductCategoryViewModel[]) {
  return categories
    .slice()
    .sort((left, right) => left.pathLabel.localeCompare(right.pathLabel))
    .map((category) => ({ category, depth: Math.max(0, category.pathLabel.split(' / ').length - 1) }));
}

function getStepIssues(step: WizardStepKey, draft: ProductDraft) {
  if (step === 'basics') {
    const issues: string[] = [];
    if (!draft.name.trim()) issues.push('Product name is required.');
    if (!draft.category_id.trim()) issues.push('Category is required.');
    return issues;
  }

  if (step === 'details') {
    const issues: string[] = [];
    if (draft.sku.trim().length > 64) issues.push('SKU should stay under 64 characters.');
    if (draft.sku_code.trim().length > 64) issues.push('SKU code should stay under 64 characters.');
    return issues;
  }

  return [];
}

function getCatalogPricingIssues(draft: CatalogPricingDraft) {
  const issues: string[] = [];
  if (!draft.product_id.trim()) issues.push('Choose a product before saving a catalog pricing row.');
  if (!draft.variant_name.trim()) issues.push('Variant name is required for a catalog pricing row.');
  if (!draft.market_id.trim()) issues.push('Market is required for catalog pricing.');
  if (!draft.currency.trim()) issues.push('Currency is required for catalog pricing.');
  if (!draft.amount.trim()) issues.push('Catalog price amount is required.');
  if (draft.amount.trim() && (Number.isNaN(Number(draft.amount)) || Number(draft.amount) < 0)) {
    issues.push('Catalog price amount must be a valid non-negative number.');
  }
  if (!draft.effective_from.trim()) issues.push('Effective from date is required for catalog pricing.');
  if (draft.effective_to.trim() && draft.effective_from.trim() && draft.effective_to < draft.effective_from) {
    issues.push('Effective to date cannot be earlier than effective from date.');
  }
  return issues;
}

export function ProductsManager({
  categories,
  products,
  markets,
  auditEvents,
  canManageCatalog = true,
}: {
  categories: ProductCategoryViewModel[];
  products: ProductViewModel[];
  markets: MarketOption[];
  auditEvents: AuditEventRecord[];
  canManageCatalog?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [workspaceProducts, setWorkspaceProducts] = useState<ProductViewModel[]>(products);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('products');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSavingCatalogPrice, setIsSavingCatalogPrice] = useState(false);
  const [isDeletingCatalogPrice, setIsDeletingCatalogPrice] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [distributionDrawerOpen, setDistributionDrawerOpen] = useState(false);
  const [catalogPricingDrawerOpen, setCatalogPricingDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductViewModel | undefined>(undefined);
  const [distributionMode, setDistributionMode] = useState<'share' | 'send' | 'export'>('share');
  const [distributionAudience, setDistributionAudience] = useState('');
  const [distributionNote, setDistributionNote] = useState('');
  const [distributionProductIds, setDistributionProductIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<ProductDraft>(createDraft());
  const [initialDraft, setInitialDraft] = useState<ProductDraft>(createDraft());
  const [catalogPricingDraft, setCatalogPricingDraft] = useState<CatalogPricingDraft>(createCatalogPricingDraft());
  const [activeStep, setActiveStep] = useState<WizardStepKey>('basics');
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');
  const [pricingFilter, setPricingFilter] = useState<'all' | 'priced' | 'unpriced'>('all');
  const [pricingStatusFilter, setPricingStatusFilter] = useState<'all' | 'active' | 'future' | 'expired'>('all');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(PRODUCT_PAGE_SIZE);
  const [pageSize, setPageSize] = useState<(typeof PRODUCT_PAGE_SIZE_OPTIONS)[number]>(PRODUCT_PAGE_SIZE);
  const [pricingVisibleCount, setPricingVisibleCount] = useState(PRODUCT_PRICING_PAGE_SIZE);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<AuditEventRecord | null>(null);

  useEffect(() => {
    setWorkspaceProducts(products);
  }, [products]);

  const categoryOptions = useMemo(() => buildCategoryOptions(categories), [categories]);
  const activeStepIndex = PRODUCT_WIZARD_STEPS.findIndex((step) => step.id === activeStep);
  const activeStepIssues = useMemo(() => getStepIssues(activeStep, draft), [activeStep, draft]);
  const catalogPricingIssues = useMemo(() => getCatalogPricingIssues(catalogPricingDraft), [catalogPricingDraft]);
  const isDirty = useMemo(() => normalizeDraft(draft) !== normalizeDraft(initialDraft), [draft, initialDraft]);
  const activeMarkets = useMemo(() => {
    const scoped = markets.filter((market) => market.isActive);
    return scoped.length ? scoped : markets;
  }, [markets]);

  const filteredProducts = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return workspaceProducts.filter((product) => {
      const matchesSearch =
        !query ||
        [
          product.name,
          product.sku ?? '',
          product.skuCode ?? '',
          product.brandName ?? '',
          product.categoryPath ?? '',
          product.description ?? '',
          product.supplierName ?? '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(query);
      const matchesStatus =
        statusFilter === 'all' ? true : statusFilter === 'active' ? product.isActive : !product.isActive;
      const matchesCategory = categoryFilter === 'all' ? true : product.categoryId === categoryFilter;
      const matchesPricing =
        pricingFilter === 'all' ? true : pricingFilter === 'priced' ? product.baselineStatus !== 'missing' : product.baselineStatus !== 'covered';
      const cat = (product.categoryPath ?? '').toLowerCase();
      // Filter by category ID (from DB) — 'all', 'ready', or a real category UUID
      const matchesCategoryTab =
        activeCategoryTab === 'all'   ? true
        : activeCategoryTab === 'ready' ? product.baselineStatus === 'covered'
        : product.categoryId === activeCategoryTab;
      return matchesSearch && matchesStatus && matchesCategory && matchesPricing && matchesCategoryTab;
    });
  }, [workspaceProducts, searchValue, statusFilter, categoryFilter, pricingFilter, activeCategoryTab]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [searchValue, statusFilter, categoryFilter, pricingFilter, workspaceMode, pageSize]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const canLoadMoreProducts = visibleCount < filteredProducts.length;

  useEffect(() => {
    if (!filteredProducts.length) {
      setSelectedProductId('');
      return;
    }
    if (!selectedProductId || !filteredProducts.some((product) => product.id === selectedProductId)) {
      setSelectedProductId(filteredProducts[0]?.id ?? '');
    }
  }, [filteredProducts, selectedProductId]);

  const selectedProduct = useMemo(
    () => filteredProducts.find((product) => product.id === selectedProductId) ?? filteredProducts[0] ?? null,
    [filteredProducts, selectedProductId],
  );

  const selectedProductPricingEntries = useMemo(() => {
    const baseEntries = selectedProduct?.pricingEntries ?? [];
    if (pricingStatusFilter === 'all') return baseEntries;
    return baseEntries.filter((entry) => entry.status === pricingStatusFilter);
  }, [pricingStatusFilter, selectedProduct]);

  useEffect(() => {
    setPricingVisibleCount(PRODUCT_PRICING_PAGE_SIZE);
  }, [selectedProductId, pricingStatusFilter]);

  const visiblePricingEntries = useMemo(
    () => selectedProductPricingEntries.slice(0, pricingVisibleCount),
    [selectedProductPricingEntries, pricingVisibleCount],
  );
  const canLoadMorePricingEntries = pricingVisibleCount < selectedProductPricingEntries.length;

  const selectedProductMissingMarkets = useMemo(() => {
    if (!selectedProduct) return [] as MarketOption[];
    const covered = new Set(selectedProduct.pricingEntries.filter((entry) => entry.status === 'active').map((entry) => entry.marketId));
    return activeMarkets.filter((market) => !covered.has(market.id));
  }, [activeMarkets, selectedProduct]);

  const baselineMatrixProducts = useMemo(() => {
    if (!selectedProduct) return [] as ProductViewModel[];
    return filteredProducts
      .filter((product) => product.rootCategoryName === selectedProduct.rootCategoryName)
      .sort((left, right) => left.baselineGapCount - right.baselineGapCount || left.name.localeCompare(right.name))
      .slice(0, 8);
  }, [filteredProducts, selectedProduct]);

  const selectedProductAuditEvents = useMemo(() => {
    if (!selectedProduct) return [];
    return auditEvents.filter((event) => {
      if (event.entity_type === 'product' && event.entity_id === selectedProduct.id) return true;
      const payload = event.payload && typeof event.payload === 'object' ? event.payload : null;
      const metadata = payload && typeof payload.metadata === 'object' ? payload.metadata as Record<string, unknown> : null;
      return typeof metadata?.product_name === 'string' && metadata.product_name === selectedProduct.name;
    });
  }, [auditEvents, selectedProduct]);

  const workspaceSummary = useMemo(
    () => ({
      total: workspaceProducts.length,
      active: workspaceProducts.filter((product) => product.isActive).length,
      priced: workspaceProducts.filter((product) => product.baselineStatus !== 'missing').length,
      gaps: workspaceProducts.filter((product) => product.baselineStatus !== 'covered').length,
      catalogRows: workspaceProducts.reduce((total, product) => total + product.priceCount, 0),
      marketsCovered: new Set(
        workspaceProducts.flatMap((product) => product.pricingEntries.filter((entry) => entry.status === 'active').map((entry) => entry.marketId)),
      ).size,
    }),
    [workspaceProducts],
  );

  const filteredSummary = useMemo(
    () => ({
      total: filteredProducts.length,
      active: filteredProducts.filter((product) => product.isActive).length,
      priced: filteredProducts.filter((product) => product.baselineStatus === 'covered').length,
      gaps: filteredProducts.filter((product) => product.baselineStatus !== 'covered').length,
    }),
    [filteredProducts],
  );

  const categoryPricingSummary = useMemo(
    () => Object.values(
      filteredProducts.reduce<Record<string, { name: string; total: number; covered: number; gaps: number; marketCoverage: number; marketTarget: number; latestPriceLabel: string }>>((acc, product) => {
        const key = product.categoryId ?? '__uncategorized__';
        const name = product.categoryPath ?? product.rootCategoryName ?? product.categoryName ?? 'Uncategorized';
        const current = acc[key] ?? { name, total: 0, covered: 0, gaps: 0, marketCoverage: 0, marketTarget: 0, latestPriceLabel: 'Quote-based' };
        current.total += 1;
        current.covered += product.baselineStatus === 'covered' ? 1 : 0;
        current.gaps += product.baselineGapCount > 0 ? 1 : 0;
        current.marketCoverage += product.baselineCoverageCount;
        current.marketTarget += product.activeMarketCount;
        if (product.latestPrice != null) current.latestPriceLabel = formatMoney(product.latestPrice, product.latestPriceCurrency);
        acc[key] = current;
        return acc;
      }, {}),
    )
      .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name))
      .slice(0, 4),
    [filteredProducts],
  );

  const upsertWorkspaceProduct = (product: ProductViewModel) => {
    setWorkspaceProducts((current) => {
      const next = current.filter((entry) => entry.id !== product.id);
      next.push(product);
      return next.sort((left, right) => left.name.localeCompare(right.name));
    });
    setSelectedProductId(product.id);
    if (editingProduct?.id === product.id) {
      setEditingProduct(product);
    }
  };

  const openAddDrawer = () => {
    const nextDraft = createDraft();
    setEditingProduct(undefined);
    setDraft(nextDraft);
    setInitialDraft(nextDraft);
    setActiveStep('basics');
    setDrawerOpen(true);
  };

  const openEditDrawer = (product: ProductViewModel) => {
    const nextDraft = createDraft(product);
    setEditingProduct(product);
    setDraft(nextDraft);
    setInitialDraft(nextDraft);
    setActiveStep('basics');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingProduct(undefined);
    const nextDraft = createDraft();
    setDraft(nextDraft);
    setInitialDraft(nextDraft);
    setActiveStep('basics');
  };

  const openDistributionDrawer = (productIds: string[]) => {
    setDistributionProductIds(Array.from(new Set(productIds)));
    setDistributionMode('share');
    setDistributionAudience('');
    setDistributionNote('');
    setDistributionDrawerOpen(true);
  };

  const closeDistributionDrawer = () => {
    setDistributionDrawerOpen(false);
    setDistributionMode('share');
    setDistributionAudience('');
    setDistributionNote('');
    setDistributionProductIds([]);
  };

  const openCatalogPricingDrawer = (product: ProductViewModel, row?: ProductMarketPriceViewModel) => {
    setCatalogPricingDraft(createCatalogPricingDraft(product, row));
    setCatalogPricingDrawerOpen(true);
  };

  const closeCatalogPricingDrawer = () => {
    setCatalogPricingDrawerOpen(false);
    setCatalogPricingDraft(createCatalogPricingDraft(selectedProduct ?? undefined));
  };

  const handleDraftChange = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'sku') {
        next.sku_code = String(value ?? '').trim();
      }
      return next;
    });
  };

  const handleCatalogDraftChange = <K extends keyof CatalogPricingDraft>(
    key: K,
    value: CatalogPricingDraft[K],
  ) => {
    setCatalogPricingDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'product_variant_id') {
        const selectedVariant = selectedProduct?.variants.find((variant) => variant.id === value);
        if (selectedVariant) next.variant_name = selectedVariant.name;
      }
      return next;
    });
  };

  const handleNextStep = () => {
    if (activeStepIssues.length) return;
    const nextStep = PRODUCT_WIZARD_STEPS[activeStepIndex + 1];
    if (nextStep) setActiveStep(nextStep.id as WizardStepKey);
  };

  const runSave = async (formData: FormData) => {
    if (editingProduct && !isDirty) {
      setMessage('No changes to save.');
      return;
    }
    setIsSaving(true);
    try {
      const result = await saveProduct(undefined, formData);
      setMessage(result?.error ?? result?.success ?? 'Saved.');
      if (!result?.error) {
        if (result?.product) {
          upsertWorkspaceProduct(result.product);
        }
        closeDrawer();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const runDelete = async (formData: FormData) => {
    setIsDeleting(true);
    try {
      const result = await deleteProduct(undefined, formData);
      setMessage(result?.error ?? result?.success ?? 'Deleted.');
      if (!result?.error && result?.deletedId) {
        setWorkspaceProducts((current) => current.filter((product) => product.id !== result.deletedId));
        if (editingProduct?.id === result.deletedId) closeDrawer();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const runDistribution = async (formData: FormData) => {
    setIsSharing(true);
    try {
      const result = await distributeProductPricing(undefined, formData);
      setMessage(result?.error ?? result?.success ?? 'Pricing shared.');
      if (!result?.error) closeDistributionDrawer();
    } finally {
      setIsSharing(false);
    }
  };

  const runCatalogPricingSave = async (formData: FormData) => {
    setIsSavingCatalogPrice(true);
    try {
      const result = await saveCatalogPrice(undefined, formData);
      setMessage(result?.error ?? result?.success ?? 'Catalog pricing saved.');
      if (!result?.error && result?.product) {
        upsertWorkspaceProduct(result.product);
        closeCatalogPricingDrawer();
      }
    } finally {
      setIsSavingCatalogPrice(false);
    }
  };

  const runCatalogPricingDelete = async (formData: FormData) => {
    setIsDeletingCatalogPrice(true);
    try {
      const result = await deleteCatalogPrice(undefined, formData);
      setMessage(result?.error ?? result?.success ?? 'Catalog pricing deleted.');
      if (!result?.error && result?.product) {
        upsertWorkspaceProduct(result.product);
        closeCatalogPricingDrawer();
      }
    } finally {
      setIsDeletingCatalogPrice(false);
    }
  };

  const pricedFilteredProductIds = useMemo(
    () => filteredProducts.filter((product) => product.baselineStatus !== 'missing').map((product) => product.id),
    [filteredProducts],
  );

  const totalActive = products.filter(p => p.isActive).length;
  const totalInactive = products.filter(p => !p.isActive).length;
  const totalGaps = filteredSummary.gaps;
  const totalCovered = filteredSummary.priced;
  const marketsCount = markets.filter(m => m.isActive).length || markets.length;

  return (
    <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',fontSize:'13px',lineHeight:'1.5',color:'#1e293b',background:'#f0f4f8',minHeight:'100vh'}}>

      {/* ── TOPBAR ── */}
      <header style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 12px',borderRadius:'6px',background:'rgba(11,46,74,.06)',border:'1px solid rgba(11,46,74,.12)'}}>
            <div style={{width:'22px',height:'22px',borderRadius:'4px',background:'linear-gradient(135deg,#0b2e4a,#0c7fff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:800,color:'white'}}>BO</div>
            <div><div style={{fontSize:'10px',fontWeight:800,color:'#0b2e4a'}}>Setu Flow client Int&apos;l</div><div style={{fontSize:'8px',color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase'}}>SETU Flow CRM</div></div>
          </div>
          <div style={{width:'1px',height:'24px',background:'#e2e8f0'}}/>
          <div><div style={{fontSize:'10px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#0c7fff'}}>Catalog</div><div style={{fontSize:'16px',fontWeight:700,color:'#1e293b',letterSpacing:'-.3px'}}>Product Catalog</div></div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          {canManageCatalog&&(
            <button type="button" onClick={openAddDrawer} style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 14px',borderRadius:'6px',background:'#0b2e4a',color:'white',border:'none',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>＋ Add product</button>
          )}
          {canManageCatalog&&(
            <button type="button" onClick={()=>openDistributionDrawer(pricedFilteredProductIds)} disabled={!pricedFilteredProductIds.length} style={{padding:'7px 12px',borderRadius:'6px',border:'1px solid #e2e8f0',background:'white',fontSize:'12px',fontWeight:600,color:'#334155',cursor:'pointer'}}>Share pricing</button>
          )}
        </div>
      </header>

      {/* ── VIEW TABS ── */}
      <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',display:'flex',alignItems:'center',gap:0}}>
        {([['products','Product setup'],['catalog','Baseline catalog']] as Array<[WorkspaceMode,string]>).map(([mode,label])=>(
          <button key={mode} type="button" onClick={()=>setWorkspaceMode(mode)} style={{padding:'11px 16px',fontSize:'12px',fontWeight:700,color:workspaceMode===mode?'#0b2e4a':'#94a3b8',cursor:'pointer',borderTop:'none',borderLeft:'none',borderRight:'none',borderBottom:workspaceMode===mode?'2px solid #0c7fff':'2px solid transparent',marginBottom:'-1px',display:'flex',alignItems:'center',gap:'6px',background:'none',transition:'color .1s'}}>
            {label}
            <span style={{background:workspaceMode===mode?'#059669':'#f1f5f9',borderRadius:'999px',padding:'1px 6px',fontSize:'9px',fontWeight:800,color:workspaceMode===mode?'white':'#475569'}}>{mode==='products'?filteredSummary.total:filteredSummary.priced}</span>
          </button>
        ))}
      </div>

      {/* ── CATEGORY VIEW TABS — matches approved catalog workbench .view-tabs behavior ── */}
      <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',display:'flex',alignItems:'stretch',gap:'0',overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
        {([
          { id: 'all',   icon: '▦', label: 'All products', count: filteredProducts.length },
          // DB-driven tabs: one per active category, sorted by sort_order
          ...categories
            .filter((c) => c.isActive && !c.parentId)  // root categories only
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((cat) => ({
              id: cat.id,
              icon: '◈',
              label: cat.name,
              count: workspaceProducts.filter((p) => p.categoryId === cat.id).length,
            })),
          { id: 'ready', icon: '✓', label: 'Quote-ready', count: workspaceProducts.filter((p) => p.baselineStatus === 'covered').length },
        ] as Array<{ id: string; icon: string; label: string; count: number }>).map((tab) => {
          const isActive = activeCategoryTab === tab.id;
          return (
            <button key={tab.id} type="button" onClick={()=>setActiveCategoryTab(tab.id)}
              style={{display:'flex',alignItems:'center',gap:'6px',padding:'11px 14px',fontSize:'12px',fontWeight:isActive?700:500,color:isActive?'#0b2e4a':'#64748b',background:'transparent',border:'none',borderBottom:isActive?'2px solid #0c7fff':'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap',transition:'color .12s, border-color .12s',flexShrink:0,marginBottom:'-1px'}}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:'20px',height:'18px',padding:'0 5px',borderRadius:'999px',fontSize:'9px',fontWeight:800,background:isActive?'#0c7fff':'#f1f5f9',color:isActive?'white':'#64748b'}}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── FILTER BAR ── */}
      <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'10px 24px',display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
        <span style={{fontSize:'10px',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',color:'#94a3b8'}}>Filter:</span>
        <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'6px 10px',border:'1px solid #e2e8f0',borderRadius:'6px',background:'white',height:'32px',minWidth:'220px'}}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
          <input value={searchValue} onChange={e=>setSearchValue(e.target.value)} placeholder="Search by product, SKU, supplier, or category" style={{border:'none',outline:'none',fontSize:'11px',color:'#1e293b',background:'transparent',width:'100%'}}/>
        </div>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} style={{border:'1px solid #e2e8f0',borderRadius:'6px',background:'#f8fafc',padding:'0 10px',height:'32px',fontSize:'11px',fontWeight:600,color:'#1e293b',minWidth:'130px'}}>
          <option value="all">All categories</option>
          {categoryOptions.map(({category})=><option key={category.id} value={category.id}>{category.pathLabel}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as 'all'|'active'|'inactive')} style={{border:'1px solid #e2e8f0',borderRadius:'6px',background:'#f8fafc',padding:'0 10px',height:'32px',fontSize:'11px',fontWeight:600,color:'#1e293b',minWidth:'110px'}}>
          <option value="all">All statuses</option><option value="active">Active only</option><option value="inactive">Inactive only</option>
        </select>
        <select value={pricingFilter} onChange={e=>setPricingFilter(e.target.value as 'all'|'priced'|'unpriced')} style={{border:'1px solid #e2e8f0',borderRadius:'6px',background:'#f8fafc',padding:'0 10px',height:'32px',fontSize:'11px',fontWeight:600,color:'#1e293b',minWidth:'140px'}}>
          <option value="all">All products</option><option value="priced">With catalog price</option><option value="unpriced">With baseline gap</option>
        </select>
        {totalGaps>0&&<span style={{display:'inline-flex',alignItems:'center',gap:'5px',padding:'3px 10px',borderRadius:'999px',fontSize:'10px',fontWeight:700,background:'#fffbeb',border:'1px solid #fde68a',color:'#92400e',cursor:'pointer'}}>⚠ {totalGaps} baseline gaps</span>}
        <span style={{marginLeft:'auto',fontSize:'10px',fontWeight:600,color:'#94a3b8'}}>{Math.min(visibleCount,filteredSummary.total)} of {filteredSummary.total} products · {marketsCount} markets</span>
      </div>

      {/* ── STATS STRIP — 5 KPIs matching reference HTML ── */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'10px',padding:'16px 24px 0'}}>
        {[
          {label:'Total products',  value:filteredSummary.total,       meta:'Across all categories',      accent:'#0c7fff'},
          {label:'Quote-ready',     value:totalCovered,                meta:'Priced + catalog active',    accent:'#059669'},
          {label:'Pricing gaps',    value:totalGaps,                   meta:'Missing market prices',      accent:totalGaps>0?'#d97706':'#cbd5e1'},
          {label:'Total variants',  value:filteredProducts.reduce((s,p)=>s+(p.variantCount??0),0), meta:'Pack sizes & formats', accent:'#7c3aed'},
          {label:'Inactive',        value:filteredProducts.filter(p=>!p.isActive).length, meta:'Deactivated from quotes', accent:filteredProducts.filter(p=>!p.isActive).length>0?'#dc2626':'#cbd5e1'},
        ].map(sc=>(
          <div key={sc.label} style={{position:'relative',overflow:'hidden',borderRadius:'16px',border:'1px solid #e2e8f0',background:'white',padding:'13px 15px',boxShadow:'0 1px 3px rgba(15,23,42,.06)',cursor:'pointer'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:'3px',background:sc.accent,borderRadius:'16px 16px 0 0'}}/>
            <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8',marginBottom:'7px'}}>{sc.label}</div>
            <div style={{fontSize:'24px',fontWeight:800,letterSpacing:'-.03em',color:'#0f172a',lineHeight:1}}>{sc.value}</div>
            <div style={{fontSize:'10px',color:'#94a3b8',marginTop:'4px',fontWeight:600}}>{sc.meta}</div>
          </div>
        ))}
      </div>

      {message&&<div style={{margin:'14px 24px 0',padding:'12px 16px',borderRadius:'12px',border:'1px solid #a7f3d0',background:'#ecfdf5',fontSize:'13px',color:'#065f46'}}>{message}</div>}
      <div style={{padding:'14px 24px 0'}}>
        <CatalogImportExportWizard products={workspaceProducts} categories={categories} canManageCatalog={canManageCatalog} />
      </div>

      <div style={{padding:"14px 24px 40px",display:"flex",flexDirection:"column",gap:"14px"}}>
      <div className="space-y-4">
        {workspaceMode === 'catalog' && categoryPricingSummary.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {categoryPricingSummary.map((item) => (
              <div key={item.name} className="rounded-panel border border-slate-200 bg-white p-4 shadow-soft">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Category pricing</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.name}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-600">
                  <p>{item.covered}/{item.total} products fully covered</p>
                  <p>{item.marketCoverage}/{item.marketTarget} active-market coverage</p>
                  <p>{item.gaps} baseline gap{item.gaps === 1 ? '' : 's'} · Anchor {item.latestPriceLabel}</p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-hero border border-slate-200 bg-white p-5 shadow-soft">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-4">
            <div className="rounded-panel border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {workspaceMode === 'catalog' ? 'Baseline authority' : 'Product master authority'}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {workspaceMode === 'catalog'
                  ? 'Products owns the baseline price truth across active markets.'
                  : 'Product setup owns master data only. Base pricing stays visible here, but pricing changes still follow the catalog rules.'}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {workspaceMode === 'catalog'
                  ? 'Select a product to review baseline coverage by active market. Customer-specific commercial deviations still belong only in RFQ and quote flows.'
                  : 'Use this mode for name, category, SKU, supplier, and activation. Baseline pricing stays separate so Products remains the global pricing authority.'}
              </p>
            </div>

            {filteredProducts.length ? (
              <div style={{overflowX:'auto',borderRadius:'16px',border:'1px solid #e2e8f0',background:'white'}}>
                {/* 9-col table header matching approved catalog workbench layout */}
                <div style={{display:'grid',gridTemplateColumns:'28px 1fr 100px 68px 88px 88px 88px 110px 76px',padding:'8px 14px',background:'#f8fafc',borderBottom:'1px solid #e2e8f0',fontSize:'9px',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'#94a3b8',alignItems:'center',minWidth:'860px'}}>
                  <div><input type="checkbox" style={{width:'13px',height:'13px'}} onChange={()=>{}} /></div>
                  <div>Product / SKU</div>
                  <div>Category</div>
                  <div style={{textAlign:'center'}}>Variants</div>
                  <div style={{textAlign:'right'}}>Ex-Factory</div>
                  <div style={{textAlign:'right'}}>FOB</div>
                  <div style={{textAlign:'right'}}>CIF</div>
                  <div style={{textAlign:'center'}}>Coverage</div>
                  <div style={{textAlign:'center'}}>Status</div>
                </div>
                {/* Group rows by category with colored dividers */}
                <div style={{minWidth:'860px'}}>
                  {(() => {
                    const catColor = (cp: string) => {
                      const l = (cp ?? '').toLowerCase();
                      if (l.includes('snack')||l.includes('crisp')||l.includes('chip')||l.includes('vacuum')) return '#7c3aed';
                      if (l.includes('powder')||l.includes('spray')||l.includes('dried')) return '#059669';
                      if (l.includes('sweet')||l.includes('jaggery')||l.includes('sugar')||l.includes('palm')) return '#d97706';
                      if (l.includes('onion')||l.includes('garlic')) return '#ea580c';
                      if (l.includes('freeze')) return '#0c7fff';
                      return '#64748b';
                    };
                    const gapBadge = (p: typeof visibleProducts[0]) => {
                      const covered = p.baselineCoverageCount ?? 0;
                      const total = p.activeMarketCount ?? marketsCount;
                      if (total === 0) return {icon:'—',bg:'#f1f5f9',border:'#e2e8f0',color:'#64748b',text:'No markets'};
                      if (covered >= total) return {icon:'✓',bg:'#f0fdf4',border:'#a7f3d0',color:'#15803d',text:`${covered}/${total} mkt`};
                      if (covered === 0)    return {icon:'✕',bg:'#fff1f2',border:'#fecaca',color:'#dc2626',text:`0/${total} mkt`};
                      return {icon:'⚠',bg:'#fffbeb',border:'#fde68a',color:'#92400e',text:`${covered}/${total} mkt`};
                    };
                    // Group by categoryPath
                    const groups: Array<{cat:string;items:typeof visibleProducts}> = [];
                    visibleProducts.forEach(p => {
                      const cat = p.categoryPath ?? 'Other';
                      const g = groups.find(x => x.cat === cat);
                      if (g) g.items.push(p); else groups.push({cat, items:[p]});
                    });
                    return groups.map(({cat, items}) => (
                      <div key={cat}>
                        {/* Category group header */}
                        <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 14px',background:'rgba(248,250,252,.9)',borderBottom:'1px solid #f1f5f9'}}>
                          <div style={{width:'8px',height:'8px',borderRadius:'50%',background:catColor(cat),flexShrink:0}}/>
                          <span style={{fontSize:'10px',fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase',color:'#475569'}}>{cat}</span>
                          <span style={{fontSize:'10px',color:'#94a3b8',marginLeft:'auto'}}>{items.length} product{items.length===1?'':'s'}</span>
                        </div>
                        {items.map(product => {
                          const isSelected = product.id === selectedProduct?.id;
                          const gap = gapBadge(product);
                          // Price cells — Ex-Factory uses latestPrice as proxy; FOB/CIF show "— add" unless variant-level data exists
                          const exFact = product.latestPrice != null ? formatMoney(product.latestPrice, product.latestPriceCurrency) : null;
                          const fob = (product as any).fobPrice != null ? formatMoney((product as any).fobPrice, product.latestPriceCurrency) : null;
                          const cif = (product as any).cifPrice != null ? formatMoney((product as any).cifPrice, product.latestPriceCurrency) : null;
                          return (
                            <div key={product.id}
                              onClick={() => setSelectedProductId(product.id)}
                              style={{display:'grid',gridTemplateColumns:'28px 1fr 100px 68px 88px 88px 88px 110px 76px',padding:'9px 14px',borderBottom:'1px solid #f8fafc',alignItems:'center',cursor:'pointer',background:isSelected?'rgba(12,127,255,.04)':'white',transition:'background .1s'}}>
                              <div onClick={e=>e.stopPropagation()}>
                                <input type="checkbox" style={{width:'13px',height:'13px'}} onChange={()=>{}} onClick={e=>e.stopPropagation()} />
                              </div>
                              <div>
                                <div style={{fontSize:'13px',fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'220px'}}>{product.name}</div>
                                <div style={{fontSize:'10px',color:'#94a3b8',marginTop:'1px'}}>SKU {product.sku??'—'}</div>
                              </div>
                              <div style={{fontSize:'11px',color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{product.categoryPath?.split('/').pop()??'—'}</div>
                              <div style={{textAlign:'center',fontSize:'12px',fontWeight:600,color:'#334155'}}>{product.variantCount??'—'}</div>
                              <div style={{textAlign:'right',fontSize:'12px',fontWeight:600,color:exFact?'#1e293b':'#cbd5e1',fontStyle:exFact?'normal':'italic'}}>{exFact??'— add'}</div>
                              <div style={{textAlign:'right',fontSize:'12px',fontWeight:600,color:fob?'#1e293b':'#cbd5e1',fontStyle:fob?'normal':'italic'}}>{fob??'— add'}</div>
                              <div style={{textAlign:'right',fontSize:'12px',fontWeight:600,color:cif?'#1e293b':'#cbd5e1',fontStyle:cif?'normal':'italic'}}>{cif??'— add'}</div>
                              <div style={{textAlign:'center'}}>
                                <span style={{display:'inline-flex',alignItems:'center',gap:'3px',fontSize:'9px',fontWeight:700,padding:'2px 6px',borderRadius:'999px',background:gap.bg,border:`1px solid ${gap.border}`,color:gap.color,whiteSpace:'nowrap'}}>
                                  {gap.icon} {gap.text}
                                </span>
                              </div>
                              <div style={{textAlign:'center'}}>
                                <span style={{fontSize:'9px',fontWeight:700,padding:'2px 7px',borderRadius:'999px',background:product.isActive?'#f0fdf4':'#f1f5f9',border:`1px solid ${product.isActive?'#a7f3d0':'#e2e8f0'}`,color:product.isActive?'#15803d':'#64748b'}}>
                                  {product.isActive?'Active':'Inactive'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
                {canLoadMoreProducts ? (
                  <div className="flex justify-center border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((current) => current + PRODUCT_PAGE_SIZE)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-soft transition hover:border-slate-300 hover:text-slate-900"
                    >
                      Load {Math.min(PRODUCT_PAGE_SIZE, filteredProducts.length - visibleCount)} more products
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <EmptyState
                  title="No products match the current filters"
                  description="Adjust search or filters, or add a product to begin structuring the catalog."
                />
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={openAddDrawer}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Add product
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedProduct ? (
              <>
                <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {workspaceMode === 'catalog' ? 'Selected baseline authority' : 'Selected product master'}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedProduct.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        {selectedProduct.categoryPath ?? 'Uncategorized'} · SKU {selectedProduct.sku ?? '—'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditDrawer(selectedProduct)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                      >
                        Edit master data
                      </button>
                      <button
                        type="button"
                        onClick={() => openCatalogPricingDrawer(selectedProduct)}
                        className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                      >
                        Add baseline row
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Baseline anchor price</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {formatMoney(selectedProduct.latestPrice, selectedProduct.latestPriceCurrency)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedProduct.latestPriceEffectiveFrom
                          ? `Latest active baseline effective ${formatDate(selectedProduct.latestPriceEffectiveFrom)}`
                          : 'No saved baseline yet'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Active-market coverage</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">
                        {selectedProduct.baselineCoverageCount}/{selectedProduct.activeMarketCount} active markets covered · {selectedProduct.baselineGapCount} gap{selectedProduct.baselineGapCount === 1 ? '' : 's'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Baseline status: {selectedProduct.baselineStatus} · Variants: {selectedProduct.variants.map((variant) => variant.name).join(', ') || 'None yet'}
                      </p>
                    </div>
                  </div>
                </div>


                <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Audit history</p>
                      <p className="mt-1 text-sm text-slate-600">Recent product and pricing actions tied to this selected product.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAuditEvent(selectedProductAuditEvents[0] ?? null);
                        setHistoryOpen(true);
                      }}
                      disabled={!selectedProductAuditEvents.length}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-300"
                    >
                      Open history drawer
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedProductAuditEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setSelectedAuditEvent(event);
                          setHistoryOpen(true);
                        }}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm hover:bg-slate-100"
                      >
                        <span className="font-medium text-slate-900">{event.event_type.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-slate-500">{event.created_at.split('T')[0] ?? 'Recent'}</span>
                      </button>
                    ))}
                    {!selectedProductAuditEvents.length ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No recent product-specific audit history has been logged yet.</div>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Category baseline matrix</p>
                      <p className="mt-1 text-sm text-slate-600">
                        This matrix shows category-level baseline coverage by product and active market. Missing cells are true baseline gaps that should be fixed in Products, while negotiated exceptions stay inside leads and quote workflows.
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{baselineMatrixProducts.length} products · {activeMarkets.length} active markets</span>
                  </div>
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full border-separate border-spacing-0 text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                          <th className="border-b border-slate-200 px-3 py-3 text-left">Product</th>
                          {activeMarkets.map((market) => (
                            <th key={market.id} className="border-b border-slate-200 px-3 py-3 text-left">{market.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {baselineMatrixProducts.map((product) => (
                          <tr key={`matrix-${product.id}`} className="bg-white align-top">
                            <td className="border-b border-slate-200 px-3 py-3">
                              <div className="font-medium text-slate-900">{product.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{product.baselineCoverageCount}/{product.activeMarketCount} active markets covered</div>
                            </td>
                            {activeMarkets.map((market) => {
                              const activeEntry = product.pricingEntries
                                .filter((entry) => entry.marketId === market.id && entry.status === 'active')
                                .sort((left, right) => String(right.effectiveFrom ?? '').localeCompare(String(left.effectiveFrom ?? '')))[0] ?? null;
                              return (
                                <td key={`${product.id}-${market.id}`} className="border-b border-slate-200 px-3 py-3">
                                  {activeEntry ? (
                                    <div>
                                      <div className="font-medium text-slate-900">{formatMoney(activeEntry.price, activeEntry.currency)}</div>
                                      <div className="mt-1 text-xs text-slate-500">{activeEntry.variantName}</div>
                                    </div>
                                  ) : (
                                    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Missing</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Missing active-market baseline today</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedProductMissingMarkets.length ? selectedProductMissingMarkets.map((market) => (
                        <span key={market.id} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{market.name}</span>
                      )) : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">No active-market gaps</span>}
                    </div>
                  </div>
                </div>

                <div className="rounded-panel border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Catalog pricing rows</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Baseline rows remain the authoritative catalog truth. RFQ and quote can override, but only inside the commercial workflow with explicit audit.
                      </p>
                    </div>
                    <div className="w-full max-w-[220px]">
                      <ToolbarSelect
                        value={pricingStatusFilter}
                        onChange={(event) => setPricingStatusFilter(event.target.value as typeof pricingStatusFilter)}
                        aria-label="Filter pricing rows by status"
                      >
                        <option value="all">All row statuses</option>
                        <option value="active">Active rows</option>
                        <option value="future">Future rows</option>
                        <option value="expired">Expired rows</option>
                      </ToolbarSelect>
                    </div>
                  </div>
                  {selectedProductPricingEntries.length ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                        <span>Rendering {Math.min(pricingVisibleCount, selectedProductPricingEntries.length)} of {selectedProductPricingEntries.length} pricing rows.</span>
                        <span>{canLoadMorePricingEntries ? 'Load more to inspect older rows.' : 'All matching rows are visible.'}</span>
                      </div>
                      {visiblePricingEntries.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">
                                  {entry.marketName} · {formatMoney(entry.price, entry.currency)}
                                </p>
                                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getRowStatusTone(entry.status)}`}>
                                  {entry.status}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                Variant {entry.variantName} · Effective {formatDate(entry.effectiveFrom)} to {formatDate(entry.effectiveTo)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openCatalogPricingDrawer(selectedProduct, entry)}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300"
                              >
                                Edit row
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {canLoadMorePricingEntries ? (
                        <button
                          type="button"
                          onClick={() => setPricingVisibleCount((current) => current + PRODUCT_PRICING_PAGE_SIZE)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Load more pricing rows
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                      No baseline rows match the current filter. Add a baseline row to make this product globally price-ready.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <EmptyState
                title="Select a product"
                description="Choose a product from the catalog workspace to review master-data truth and pricing coverage."
              />
            )}
          </div>
        </div>
      </div>

      </div>

      <AuditHistoryDrawer event={selectedAuditEvent} open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <RightDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingProduct ? 'Edit product master' : 'Add product master'}
        description="Manage product identity, SKU truth, and supplier details. Baseline catalog coverage is reviewed separately in baseline catalog mode."
        widthClassName="sm:max-w-3xl lg:max-w-5xl"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void runSave(formData);
          }}
        >
          <input type="hidden" name="id" value={draft.id} />
          <input type="hidden" name="is_active" value={String(draft.is_active)} />
          <input type="hidden" name="name" value={draft.name} />
          <input type="hidden" name="category_id" value={draft.category_id} />
          <input type="hidden" name="description" value={draft.description} />
          <input type="hidden" name="sku" value={draft.sku} />
          <input type="hidden" name="sku_code" value={draft.sku_code || draft.sku} />
          <input type="hidden" name="brand_name" value={draft.brand_name} />
          <input type="hidden" name="pack_size" value={draft.pack_size} />
          <input type="hidden" name="hsn_code" value={draft.hsn_code} />
          <input type="hidden" name="short_code" value={draft.short_code} />
          <input type="hidden" name="supplier_name" value={draft.supplier_name} />
          <input type="hidden" name="country_of_origin" value={draft.country_of_origin} />
          <input type="hidden" name="export_metadata" value={draft.export_metadata} />
          <input type="hidden" name="packaging_type" value={draft.packaging_type} />
          <input type="hidden" name="packaging_unit" value={draft.packaging_unit} />
          <input type="hidden" name="units_per_case" value={draft.units_per_case} />
          <input type="hidden" name="net_weight_kg" value={draft.net_weight_kg} />
          <input type="hidden" name="shipment_notes" value={draft.shipment_notes} />
          <input type="hidden" name="pricing_mode_default" value={draft.pricing_mode_default} />
          <div className="rounded-hero border border-slate-200 bg-slate-50 p-3 shadow-soft">
            <WizardShell
              steps={PRODUCT_WIZARD_STEPS}
              activeStepId={activeStep}
              onStepChange={(stepId) => setActiveStep(stepId as WizardStepKey)}
            >
              {activeStep === 'basics' ? (
                <WizardStepBody
                  title="Product basics"
                  description="Set the product identity that downstream catalog pricing depends on."
                  aside={
                    <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-soft">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Operating rule</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Product setup owns the master record. Catalog pricing rows are edited only from the catalog mode.
                      </p>
                    </div>
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Product name</label>
                      <input
                        value={draft.name}
                        onChange={(event) => handleDraftChange('name', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Category</label>
                      <select
                        value={draft.category_id}
                        onChange={(event) => handleDraftChange('category_id', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      >
                        <option value="">Select category</option>
                        {categoryOptions.map(({ category }) => (
                          <option key={category.id} value={category.id}>
                            {category.pathLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Status</label>
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(event) => handleDraftChange('is_active', event.target.checked)}
                          className={checkboxClassName}
                        />
                        Keep product active in the master catalog
                      </label>
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Description</label>
                      <textarea
                        value={draft.description}
                        onChange={(event) => handleDraftChange('description', event.target.value)}
                        rows={5}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                  </div>
                </WizardStepBody>
              ) : null}

              {activeStep === 'details' ? (
                <WizardStepBody
                  title="Catalog details"
                  description="Keep SKU and supplier details clean and consistent."
                  aside={
                    <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-soft">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">SKU sync</p>
                      <p className="mt-2 text-sm text-slate-600">
                        SKU code mirrors SKU automatically so lists and exports stay aligned.
                      </p>
                    </div>
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">SKU</label>
                      <input
                        value={draft.sku}
                        onChange={(event) => handleDraftChange('sku', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">SKU code</label>
                      <input
                        value={draft.sku_code || draft.sku}
                        readOnly
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Brand</label>
                      <input
                        value={draft.brand_name}
                        onChange={(event) => handleDraftChange('brand_name', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Supplier</label>
                      <input
                        value={draft.supplier_name}
                        onChange={(event) => handleDraftChange('supplier_name', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Pack size</label>
                      <input
                        value={draft.pack_size}
                        onChange={(event) => handleDraftChange('pack_size', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">HSN code</label>
                      <input
                        value={draft.hsn_code}
                        onChange={(event) => handleDraftChange('hsn_code', event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Country of origin</label>
                      <input value={draft.country_of_origin} onChange={(event) => handleDraftChange('country_of_origin', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Export / trade metadata</label>
                      <input value={draft.export_metadata} onChange={(event) => handleDraftChange('export_metadata', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Packaging type</label>
                      <input value={draft.packaging_type} onChange={(event) => handleDraftChange('packaging_type', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Packaging unit</label>
                      <input value={draft.packaging_unit} onChange={(event) => handleDraftChange('packaging_unit', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Units per case</label>
                      <input value={draft.units_per_case} onChange={(event) => handleDraftChange('units_per_case', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Net weight (kg)</label>
                      <input value={draft.net_weight_kg} onChange={(event) => handleDraftChange('net_weight_kg', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Unit of measure</label>
                      <select value={draft.pricing_mode_default} onChange={(event) => handleDraftChange('pricing_mode_default', event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="unit">Unit</option><option value="case">Case</option><option value="kg">Kg</option></select>
                    </div>
                    <div className="space-y-2 lg:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Shipment-relevant notes</label>
                      <textarea value={draft.shipment_notes} onChange={(event) => handleDraftChange('shipment_notes', event.target.value)} className="min-h-[96px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                    </div>
                  </div>
                </WizardStepBody>
              ) : null}

              {activeStep === 'review' ? (
                <WizardStepBody
                  title="Review and save"
                  description="Confirm the product details before saving. Pricing rows will remain managed from the catalog side."
                  aside={
                    <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-soft">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ready to save</p>
                      <p className="mt-2 text-sm text-slate-600">
                        {editingProduct && !isDirty ? 'No change detected yet.' : 'Save when the master record looks right.'}
                      </p>
                    </div>
                  }
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-soft">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Identity</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{draft.name || 'Untitled product'}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {categories.find((category) => category.id === draft.category_id)?.pathLabel ?? 'No category selected'}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{draft.is_active ? 'Active record' : 'Inactive record'}</p>
                    </div>
                    <div className="rounded-panel border border-slate-200 bg-white p-4 shadow-soft">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Catalog details</p>
                      <p className="mt-3 text-sm text-slate-700">SKU: {draft.sku || '—'}</p>
                      <p className="mt-1 text-sm text-slate-700">Brand: {draft.brand_name || '—'}</p>
                      <p className="mt-1 text-sm text-slate-700">Supplier: {draft.supplier_name || '—'}</p>
                      <p className="mt-1 text-sm text-slate-700">Origin: {draft.country_of_origin || '—'}</p>
                      <p className="mt-1 text-sm text-slate-700">Export metadata: {draft.export_metadata || '—'}</p>
                      <p className="mt-1 text-sm text-slate-700">Packaging: {draft.packaging_type || draft.pack_size || '—'} {draft.packaging_unit ? `· ${draft.packaging_unit}` : ''}</p>
                      <p className="mt-1 text-sm text-slate-700">UOM / case: {draft.pricing_mode_default || 'unit'}{draft.units_per_case ? ` · ${draft.units_per_case} per case` : ''}</p>
                      <p className="mt-1 text-sm text-slate-700">Pricing rows: manage in Catalog pricing mode</p>
                    </div>
                  </div>
                </WizardStepBody>
              ) : null}
            </WizardShell>
          </div>
          <WizardValidationSummary issues={activeStepIssues} />
          <CommercialWizardFooter
            title={editingProduct ? 'Save product master' : 'Create product master'}
            description="Master-data updates save immediately into the authoritative catalog workspace."
            isPending={isSaving}
            activeStepIndex={activeStepIndex}
            totalSteps={PRODUCT_WIZARD_STEPS.length}
            activeStepTitle={PRODUCT_WIZARD_STEPS[activeStepIndex]?.title ?? 'Review'}
            canGoNext={Boolean(!activeStepIssues.length && (!editingProduct || isDirty || activeStep !== 'review'))}
            submitDisabled={Boolean(activeStepIssues.length) || (editingProduct ? !isDirty : false)}
            canGoBack={activeStepIndex > 0}
            onBack={() => setActiveStep(PRODUCT_WIZARD_STEPS[Math.max(0, activeStepIndex - 1)]?.id as WizardStepKey)}
            onCancel={closeDrawer}
            onNext={handleNextStep}
            nextLabel="Continue"
            submitLabel={editingProduct ? 'Save product master' : 'Create product master'}
          />
        </form>
      </RightDrawer>

      <RightDrawer
        open={catalogPricingDrawerOpen}
        onClose={closeCatalogPricingDrawer}
        title={catalogPricingDraft.price_row_id ? 'Edit catalog pricing row' : 'Add catalog pricing row'}
        description="Manage the authoritative market-specific baseline. RFQ and quote overrides must stay downstream and auditable."
        widthClassName="sm:max-w-2xl lg:max-w-3xl"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void runCatalogPricingSave(formData);
          }}
        >
          <input type="hidden" name="price_row_id" value={catalogPricingDraft.price_row_id} />
          <input type="hidden" name="product_id" value={catalogPricingDraft.product_id} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium text-slate-700">Product</label>
              <input
                value={selectedProduct?.name ?? 'Select a product first'}
                readOnly
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Variant</label>
              <select
                value={catalogPricingDraft.product_variant_id}
                onChange={(event) => handleCatalogDraftChange('product_variant_id', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="">Create or choose variant</option>
                {selectedProduct?.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Variant name</label>
              <input
                value={catalogPricingDraft.variant_name}
                onChange={(event) => handleCatalogDraftChange('variant_name', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Market</label>
              <select
                name="market_id"
                value={catalogPricingDraft.market_id}
                onChange={(event) => handleCatalogDraftChange('market_id', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="">Select market</option>
                {activeMarkets.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Currency</label>
              <input
                name="currency"
                value={catalogPricingDraft.currency}
                onChange={(event) => handleCatalogDraftChange('currency', event.target.value.toUpperCase())}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Catalog price</label>
              <input
                name="amount"
                value={catalogPricingDraft.amount}
                onChange={(event) => handleCatalogDraftChange('amount', event.target.value)}
                inputMode="decimal"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Effective from</label>
              <input
                type="date"
                name="effective_from"
                value={catalogPricingDraft.effective_from}
                onChange={(event) => handleCatalogDraftChange('effective_from', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Effective to</label>
              <input
                type="date"
                name="effective_to"
                value={catalogPricingDraft.effective_to}
                onChange={(event) => handleCatalogDraftChange('effective_to', event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
          </div>
          <input type="hidden" name="product_variant_id" value={catalogPricingDraft.product_variant_id} />
          <input type="hidden" name="variant_name" value={catalogPricingDraft.variant_name} />
          <input type="hidden" name="pricing_market_id" value={catalogPricingDraft.market_id} />
          <input type="hidden" name="pricing_currency" value={catalogPricingDraft.currency} />
          <input type="hidden" name="pricing_amount" value={catalogPricingDraft.amount} />
          <WizardValidationSummary issues={catalogPricingIssues} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-500">
              Catalog rows are the reusable baseline. Customer-specific negotiation belongs in RFQ and quote.
            </div>
            <div className="flex flex-wrap gap-2">
              {catalogPricingDraft.price_row_id ? (
                <button
                  type="button"
                  disabled={isDeletingCatalogPrice}
                  onClick={() => {
                    const formData = new FormData();
                    formData.set('product_id', catalogPricingDraft.product_id);
                    formData.set('price_row_id', catalogPricingDraft.price_row_id);
                    void runCatalogPricingDelete(formData);
                  }}
                  className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  {isDeletingCatalogPrice ? 'Removing…' : 'Delete row'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={closeCatalogPricingDrawer}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={Boolean(catalogPricingIssues.length) || isSavingCatalogPrice}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSavingCatalogPrice ? 'Saving…' : catalogPricingDraft.price_row_id ? 'Save row' : 'Create row'}
              </button>
            </div>
          </div>
        </form>
      </RightDrawer>

      <RightDrawer
        open={distributionDrawerOpen}
        onClose={closeDistributionDrawer}
        title="Share pricing"
        description="Share, send, or export saved catalog price rows for the currently filtered priced products."
        widthClassName="sm:max-w-xl lg:max-w-2xl"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void runDistribution(formData);
          }}
        >
          <input type="hidden" name="product_ids" value={distributionProductIds.join(',')} />
          <div className="rounded-hero border border-slate-200 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pricing distribution</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Delivery mode</label>
                <select
                  name="delivery"
                  value={distributionMode}
                  onChange={(event) => setDistributionMode(event.target.value as 'share' | 'send' | 'export')}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                >
                  <option value="share">Share</option>
                  <option value="send">Send</option>
                  <option value="export">Export</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Recipient or audience</label>
                <input
                  name="audience"
                  value={distributionAudience}
                  onChange={(event) => setDistributionAudience(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Note</label>
                <textarea
                  name="note"
                  rows={4}
                  value={distributionNote}
                  onChange={(event) => setDistributionNote(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={closeDistributionDrawer}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSharing}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSharing ? 'Working…' : 'Continue'}
            </button>
          </div>
        </form>
      </RightDrawer>
      </div>
    </div>
  );
}
