'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { LeadDrawerLead, LeadDrawerProps, LeadDrawerSavePayload, LeadWizardStepId } from '@/features/leads/types/workspace';
import RightDrawer from '@/components/RightDrawer';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Database } from '@/types/database';
import { openOrCreateLeadQuoteDraft, saveLead } from '@/features/leads/server/actions';
import { saveSettingsListItem } from '@/features/settings/server/actions';
import LeadRecentSection from './LeadRecentSection';
import LeadBasicInfoSection from './LeadBasicInfoSection';
import ProductMarketsSection from './ProductMarketsSection';
import LeadStageSection from './LeadStageSection';
import LeadDrawerFooter from './LeadDrawerFooter';
import { QuoteEditWizardForm } from '@/features/quotes/components/quote-wizard-form';
import { WizardShell, WizardStepBody, WizardValidationSummary, type WizardStepDefinition } from '@/components/ui/wizard-shell';
import { buildCountrySettingsFormData, buildMarketSettingsFormData } from './lead-drawer-helpers';
import { buildCatalogProductOptions } from '@/lib/catalog-pricing-model';
import { parseQuoteWorkflow } from '@/lib/quoteWorkflow';
import type { ContactPostApplyAssistResult } from '@/lib/contact-exchange/contact-post-apply-assist';
import { buildContactScanAfterSaveGuidance, type ContactAfterSaveGuidanceResult } from '@/lib/contact-exchange/contact-after-save-guidance';

type LeadFormState = { error?: string; success?: string; lead?: LeadDrawerLead; selectedMarketIds?: string[]; selectedProductIds?: string[] };
type Stage = { id: string; name: string; pipeline_id: string; sort_order?: number };
type Pipeline = { id: string; name: string; lead_type: 'buyer' | 'supplier' | 'both'; is_default: boolean };
type Option = { id: string; name: string };
type Product = { id: string; name: string; sku: string | null; category_id: string | null };
type Variant = { id: string; name: string; product_id: string };
type Price = { id: string; product_variant_id: string; market_id: string | null; price: number; currency: string; effective_from: string; effective_to: string | null };
type PricingRule = { id: string; product_id?: string | null; product_variant_id?: string | null; effective_from?: string | null; effective_to?: string | null; ex_factory_usd?: number | null; fob_usd?: number | null; ex_factory_inr?: number | null; fob_inr?: number | null; ex_factory_usd_per_case?: number | null; ex_factory_usd_per_unit?: number | null; fob_usd_per_case?: number | null; fob_usd_per_unit?: number | null; bulk_usd_per_kg?: number | null; pricing_type?: string | null };
type ProductCategory = {
  id: string;
  name: string;
  is_active?: boolean;
  sort_order?: number;
  parent_id?: string | null;
};
type Profile = { id: string; full_name: string | null; username: string | null };
type Country = { id: string; name: string; phone_code: string | null; market_id: string | null };
type Market = { id: string; name: string };
type FollowUp = {
  id: string;
  lead_id: string | null;
  scheduled_at: string | null;
  status: string;
  created_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
};
type Activity = { id: string; lead_id: string; kind: string; message: string; occurred_at: string };
type StageHistory = {
  id: string;
  from_stage_id: string | null;
  to_stage_id: string | null;
  changed_at: string;
  note: string | null;
};
type Rfq = {
  id: string;
  lead_id: string | null;
  status: string;
  currency: string | null;
  validity_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};
type QuoteLineItem = {
  id: string;
  quote_id: string | null;
  product_id: string | null;
  product_variant_id?: string | null;
  catalog_price_id?: string | null;
  catalog_price_amount?: number | null;
  catalog_price_currency?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  currency?: string | null;
  is_price_overridden?: boolean | null;
  override_reason?: string | null;
  overridden_by?: string | null;
  overridden_at?: string | null;
  notes?: string | null;
};
type Quote = {
  id: string;
  lead_id: string;
  rfq_id: string | null;
  status: string;
  currency: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;
  quote_number?: string | null;
  current_version_id?: string | null;
  lineItems?: QuoteLineItem[];
};
type ComplianceItem = {
  id: string;
  lead_id: string;
  compliance_item_id: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
};
type ComplianceDefinition = { id: string; code: string; description: string };
type QuoteVersion = { id: string; quote_id: string | null; version_no?: number | null; status?: string | null; created_at?: string | null; approved_at?: string | null; sent_at?: string | null; pdf_document_id?: string | null };
type LeadDocument = { id: string; related_entity?: string | null; related_id?: string | null; requirement_code: string | null; status: string | null; expires_at: string | null; uploaded_at?: string | null; doc_type?: string | null; file_name?: string | null; linked_quote_id?: string | null; source_related_entity?: string | null; review_notes?: string | null };
type CoverageSelection = { key: string; categoryId: string; productIds: string[] };

function createCoverageSelection(categoryId = '', productIds: string[] = [], seed = 0): CoverageSelection {
  return {
    key: buildCoverageSelectionKey(categoryId, seed),
    categoryId,
    productIds,
  };
}

function toDatetimeLocalValue(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 16);
}

function getDefaultFollowUpLocalValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setSeconds(0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function inputClassName() {
  return 'h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400';
}

function formatLocalDateTimeValue(value?: string | null) {
  if (!value) return 'Not set';
  const normalized = String(value).trim();
  if (!normalized) return 'Not set';
  if (normalized.includes('T')) return normalized.replace('T', ' ');
  return normalized;
}

function buildCoverageSelectionKey(categoryId = '', seed = 0) {
  return `${categoryId || 'coverage'}-${seed}`;
}



function normalizeLeadFormValues(values: Record<string, unknown>) {
  return JSON.stringify(values);
}


const LEAD_WIZARD_STEPS: WizardStepDefinition[] = [
  {
    id: 'basics',
    title: 'Lead basics',
    shortLabel: 'Basics',
    description: 'Save the minimum valid lead first, then move into routing only after the entry is secure.',
  },
  {
    id: 'workflow',
    title: 'Workflow and ownership',
    shortLabel: 'Workflow',
    description: 'Set the follow-up rhythm, routing, and ownership details that keep the lead actionable.',
  },
  {
    id: 'coverage',
    title: 'Coverage and notes',
    shortLabel: 'Coverage',
    description: 'Capture market, product, and note context without changing the existing save behavior.',
  },
];

const LEAD_QUOTE_STEP: WizardStepDefinition = {
  id: 'quotes',
  title: 'Quote review',
  shortLabel: 'Quotes',
  description: 'Review customer-ready quotes, version history, and quote actions without leaving the lead drawer.',
};

export function LeadDrawer({
  lead,
  stages,
  pipelines,
  nextSteps,
  tradeEvents,
  productCategories = [],
  products,
  markets,
  variants = [],
  prices = [],
  pricingRules = [],
  profiles,
  countries,
  followUps = [],
  activities = [],
  stageHistory = [],
  rfqs = [],
  quotes = [],
  quoteVersions = [],
  documents = [],
  complianceItems = [],
  complianceDefinitions = [],
  selectedMarketIds = [],
  selectedProductIds = [],
  currentUserId = '',
  open = false,
  onClose,
  onSaved,
  onOpenInlineQuote,
  mode = 'quick',
  title,
  canNavigatePrev = false,
  canNavigateNext = false,
  onNavigatePrev,
  onNavigateNext,
  navigationMeta,
  initialStepId,
  prefill = null,
  fastFieldMode = false,
}: LeadDrawerProps) {
  const router = useRouter();
  const isQuickMode = mode === 'quick';
  const isEditingExistingLead = Boolean(lead?.id);
  const isFastFieldMode = Boolean(fastFieldMode && isQuickMode && !isEditingExistingLead && lead?.trade_event_id);
  const prefilledProductIds = useMemo(() => Array.from(new Set(prefill?.selectedProductIds ?? [])).filter(Boolean), [prefill]);
  const [autoOpenQuoteAfterSave, setAutoOpenQuoteAfterSave] = useState(Boolean(prefill?.autoOpenQuoteAfterSave && !isEditingExistingLead));
  const shouldAutoOpenQuoteAfterSave = Boolean(autoOpenQuoteAfterSave && !isEditingExistingLead);
  const [state, setState] = useState<LeadFormState>({});
  const [isPending, startTransition] = useTransition();
  const [leadType, setLeadType] = useState<'buyer' | 'supplier'>(lead?.lead_type ?? 'buyer');
  const [companyName, setCompanyName] = useState<string>(lead?.company_name ?? '');
  const [contactName, setContactName] = useState<string>(lead?.contact_name ?? '');
  const [jobTitle, setJobTitle] = useState<string>(lead?.job_title ?? '');
  const [email, setEmail] = useState<string>(lead?.email ?? '');
  const [phone, setPhone] = useState<string>(lead?.phone ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState<string>((lead as any)?.whatsapp_number ?? '');
  const [phoneSecondary, setPhoneSecondary] = useState<string>(lead?.phone_secondary ?? '');
  const [website, setWebsite] = useState<string>(lead?.website ?? '');
  const [tradeEventId, setTradeEventId] = useState<string>(lead?.trade_event_id ?? '');
  const [pipelineId, setPipelineId] = useState<string>(lead?.pipeline_id ?? '');
  const [stageId, setStageId] = useState<string>(lead?.stage_id ?? '');
  const [countryId, setCountryId] = useState<string>(lead?.country_id ?? '');
  const [followUpAt, setFollowUpAt] = useState<string>('');
  const [nextStepId, setNextStepId] = useState<string>('');
  const [ownerUserId, setOwnerUserId] = useState<string>('');
  const [coverageSelections, setCoverageSelections] = useState<CoverageSelection[]>(prefilledProductIds.length ? [createCoverageSelection('', prefilledProductIds, 0)] : []);
  const [selectedMarketIdSet, setSelectedMarketIdSet] = useState<string[]>(selectedMarketIds);
  const [notes, setNotes] = useState<string>(lead?.notes ?? '');
  const [sourceType, setSourceType] = useState<string>(lead?.source_type ?? prefill?.sourceType ?? '');
  const [sourceLabel, setSourceLabel] = useState<string>(lead?.source_label ?? prefill?.sourceLabel ?? '');
  const [postApplyAssist, setPostApplyAssist] = useState<ContactPostApplyAssistResult | null>(null);
  const [afterSaveGuidance, setAfterSaveGuidance] = useState<ContactAfterSaveGuidanceResult | null>(null);
  const [defaultFollowUpLocal, setDefaultFollowUpLocal] = useState('');
  const [quoteActionError, setQuoteActionError] = useState<string | null>(null);
  const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteRowsState, setQuoteRowsState] = useState<Quote[]>(quotes);
  const [quoteVersionRowsState, setQuoteVersionRowsState] = useState<QuoteVersion[]>(quoteVersions);
  const [showNewCountryForm, setShowNewCountryForm] = useState(false);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryIso2, setNewCountryIso2] = useState('');
  const [newCountryIso3, setNewCountryIso3] = useState('');
  const [newCountryPhone, setNewCountryPhone] = useState('');
  const [newCountryMarketId, setNewCountryMarketId] = useState('');
  const [pendingCountryName, setPendingCountryName] = useState('');
  const [showNewMarketForm, setShowNewMarketForm] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketCode, setNewMarketCode] = useState('');
  const [pendingMarketName, setPendingMarketName] = useState('');
  const [activeStepId, setActiveStepId] = useState<LeadWizardStepId>(initialStepId ?? 'basics');
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [showFastFieldDetails, setShowFastFieldDetails] = useState(false);
  const companyInputRef = useRef<HTMLInputElement | null>(null);
  const quoteProductsRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const resetMarketDraft = () => {
    setNewMarketName('');
    setNewMarketCode('');
    setShowNewMarketForm(false);
  };

  const resetCountryDraft = () => {
    setNewCountryName('');
    setNewCountryIso2('');
    setNewCountryIso3('');
    setNewCountryPhone('');
    setNewCountryMarketId('');
    setShowNewCountryForm(false);
  };


  const handleAddMarket = () => {
    if (!newMarketName.trim()) return;
    const fd = buildMarketSettingsFormData(newMarketName, newMarketCode);
    if (isEditingExistingLead && !hasLeadChanges) {
      setState({ success: 'No changes to save.' });
      return;
    }

    startTransition(() => {
      void saveSettingsListItem(undefined, fd).then((result) => {
        if (result?.error) {
          setState({ error: result.error });
          return;
        }
        setPendingMarketName(newMarketName.trim());
        resetMarketDraft();
        router.refresh();
      });
    });
  };

  const handleAddCountry = () => {
    if (!newCountryName.trim()) return;
    const fd = buildCountrySettingsFormData({
      name: newCountryName,
      iso2: newCountryIso2,
      iso3: newCountryIso3,
      phone: newCountryPhone,
      marketId: newCountryMarketId,
    });
    startTransition(() => {
      void saveSettingsListItem(undefined, fd).then((result) => {
        if (result?.error) {
          setState({ error: result.error });
          return;
        }
        setPendingCountryName(newCountryName.trim());
        resetCountryDraft();
        router.refresh();
      });
    });
  };


  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowLeft' && event.altKey && canNavigatePrev) onNavigatePrev?.();
      if (event.key === 'ArrowRight' && event.altKey && canNavigateNext) onNavigateNext?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canNavigateNext, canNavigatePrev, onClose, onNavigateNext, onNavigatePrev, open]);

  const defaultNextStepId = useMemo(
    () =>
      lead?.next_step_id ??
      nextSteps.find((step) => step.name.toLowerCase() === 'send introduction')?.id ??
      nextSteps[0]?.id ??
      '',
    [lead?.next_step_id, nextSteps],
  );

  const defaultOwnerId = useMemo(
    () => lead?.owner_user_id ?? currentUserId ?? profiles[0]?.id ?? '',
    [currentUserId, lead?.owner_user_id, profiles],
  );

  useEffect(() => {
    if (!open) return;
    setDefaultFollowUpLocal(getDefaultFollowUpLocalValue());
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setState({});
    setValidationIssues([]);
    setActiveStepId(initialStepId ?? 'basics');
    setLeadType(lead?.lead_type ?? 'buyer');
    setCompanyName(lead?.company_name ?? '');
    setContactName(lead?.contact_name ?? '');
    setEmail(lead?.email ?? '');
    setPhone(lead?.phone ?? '');
    setWhatsappNumber((lead as any)?.whatsapp_number ?? '');
    setTradeEventId(lead?.trade_event_id ?? '');
    setPipelineId(lead?.pipeline_id ?? '');
    setStageId(lead?.stage_id ?? '');
    setCountryId(lead?.country_id ?? '');
    setFollowUpAt(toDatetimeLocalValue(lead?.next_follow_up_at) || defaultFollowUpLocal || getDefaultFollowUpLocalValue());
    setAutoOpenQuoteAfterSave(Boolean(prefill?.autoOpenQuoteAfterSave && !lead?.id));
    setNextStepId(defaultNextStepId);
    setOwnerUserId(defaultOwnerId);
    setSelectedMarketIdSet(selectedMarketIds);
    setNotes(lead?.notes ?? '');
    setSourceType(lead?.source_type ?? prefill?.sourceType ?? '');
    setSourceLabel(lead?.source_label ?? prefill?.sourceLabel ?? '');
    setPostApplyAssist(null);
    setAfterSaveGuidance(null);

    const groupedSelections = new Map<string, string[]>();
    for (const productId of selectedProductIds) {
      const product = products.find((item) => item.id === productId);
      const categoryKey = product?.category_id ?? '';
      const current = groupedSelections.get(categoryKey) ?? [];
      current.push(productId);
      groupedSelections.set(categoryKey, current);
    }

    if (groupedSelections.size) {
      setCoverageSelections(Array.from(groupedSelections.entries()).map(([categoryId, productIds], index) => createCoverageSelection(categoryId, productIds, index)));
    } else if (prefilledProductIds.length) {
      setCoverageSelections([createCoverageSelection('', prefilledProductIds, 0)]);
    } else {
      setCoverageSelections([createCoverageSelection('', [], 0)]);
    }
  }, [defaultFollowUpLocal, defaultNextStepId, defaultOwnerId, lead, open, prefill?.autoOpenQuoteAfterSave, prefill?.sourceLabel, prefill?.sourceType, prefilledProductIds, products, selectedMarketIds, selectedProductIds]);

  useEffect(() => {
    if (!(isEditingExistingLead && !isQuickMode) && activeStepId === 'quotes') {
      setActiveStepId('coverage');
    }
  }, [activeStepId, isEditingExistingLead, isQuickMode]);

  useEffect(() => {
    if (!open) return;
    if (initialStepId) setActiveStepId(initialStepId);
  }, [initialStepId, open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      companyInputRef.current?.focus();
      companyInputRef.current?.select();
    }, 0);
    return () => clearTimeout(timer);
  }, [lead?.id, mode, open]);

  useEffect(() => {
    if (!pendingCountryName) return;
    const newlyAdded = countries.find((c) => c.name === pendingCountryName);
    if (newlyAdded) {
      setCountryId(newlyAdded.id);
      setPendingCountryName('');
    }
  }, [countries, pendingCountryName]);

  useEffect(() => {
    if (!pendingMarketName) return;
    const newlyAdded = markets.find((m) => m.name === pendingMarketName);
    if (newlyAdded) {
      setSelectedMarketIdSet((current) => {
        const next = new Set(current);
        next.add(newlyAdded.id);
        return Array.from(next);
      });
      setPendingMarketName('');
    }
  }, [markets, pendingMarketName]);


  useEffect(() => {
    setQuoteRowsState(quotes);
  }, [quotes]);

  useEffect(() => {
    setQuoteVersionRowsState(quoteVersions);
  }, [quoteVersions]);

  const availablePipelines = useMemo(
    () => pipelines.filter((pipeline) => pipeline.lead_type === leadType),
    [pipelines, leadType],
  );

  const availableStages = useMemo(() => {
    const scoped = stages.filter((stage) => !pipelineId || stage.pipeline_id === pipelineId);
    return [...scoped].sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0));
  }, [pipelineId, stages]);

  useEffect(() => {
    if (!pipelineId && availablePipelines.length) {
      const fallback = availablePipelines.find((pipeline) => pipeline.is_default) ?? availablePipelines[0];
      setPipelineId(fallback?.id ?? '');
    }
  }, [availablePipelines, pipelineId]);

  useEffect(() => {
    if (!pipelineId) return;
    if (!availableStages.some((stage) => stage.id === stageId)) {
      setStageId('');
    }
  }, [availableStages, pipelineId, stageId]);

  useEffect(() => {
    if (!stageId && availableStages.length && mode !== 'quick') {
      setStageId(availableStages[0]?.id ?? '');
    }
  }, [availableStages, mode, stageId]);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.id === countryId) ?? null,
    [countries, countryId],
  );

  const selectedPhoneCode = selectedCountry?.phone_code ?? lead?.phone_country_code ?? '';
  const autoMarketId = selectedCountry?.market_id ?? null;

  const selectedCategoryIds = useMemo(
    () => coverageSelections.map((selection) => selection.categoryId).filter(Boolean),
    [coverageSelections],
  );

  const selectedProductIdSet = useMemo(
    () => Array.from(new Set(coverageSelections.flatMap((selection) => selection.productIds))),
    [coverageSelections],
  );

  const availableCountries = useMemo(() => {
    const filterMarketIds = autoMarketId ? [autoMarketId] : selectedMarketIdSet;
    if (!filterMarketIds.length) return countries;
    return countries.filter((country) => country.market_id && filterMarketIds.includes(country.market_id));
  }, [autoMarketId, countries, selectedMarketIdSet]);

  const categoryTree = useMemo(() => {
    const groupMap = new Map<string | null, ProductCategory[]>();
    for (const cat of productCategories) {
      const parentId = cat.parent_id ?? null;
      const list = groupMap.get(parentId) ?? [];
      list.push(cat);
      groupMap.set(parentId, list);
    }

    const result: Array<{ category: ProductCategory; indent: number }> = [];

    const sortFn = (a: ProductCategory, b: ProductCategory) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    };

    function build(parentId: string | null, indent: number) {
      const children = groupMap.get(parentId) ?? [];
      children.sort(sortFn);
      for (const child of children) {
        result.push({ category: child, indent });
        build(child.id, indent + 1);
      }
    }

    build(null, 0);
    return result;
  }, [productCategories]);


  useEffect(() => {
    if (!countryId) return;
    if (availableCountries.some((country) => country.id === countryId)) return;
    setCountryId('');
  }, [availableCountries, countryId]);

  useEffect(() => {
    if (!autoMarketId) return;
    setSelectedMarketIdSet((current) => (current.includes(autoMarketId) ? current : [...current, autoMarketId]));
  }, [autoMarketId]);

  const handleAddCoverageSelection = () => {
    setCoverageSelections((current) => [...current, createCoverageSelection('', [], current.length)]);
  };

  const handleCoverageCategoryChange = (key: string, categoryId: string) => {
    setCoverageSelections((current) =>
      current.map((selection) =>
        selection.key === key
          ? {
              ...selection,
              categoryId,
              productIds: selection.productIds.filter((productId) => products.some((product) => product.id === productId && product.category_id === categoryId)),
            }
          : selection,
      ),
    );
  };

  const handleFastFieldProductChange = (productId: string) => {
    if (!productId) {
      setCoverageSelections([createCoverageSelection('', [], 0)]);
      return;
    }
    const product = products.find((item) => item.id === productId);
    setCoverageSelections([createCoverageSelection(product?.category_id ?? '', [productId], 0)]);
  };

  const handleToggleCoverageProduct = (key: string, productId: string, checked: boolean) => {
    setCoverageSelections((current) =>
      current.map((selection) => {
        if (selection.key !== key) return selection;
        const nextIds = checked
          ? Array.from(new Set([...selection.productIds, productId]))
          : selection.productIds.filter((id) => id !== productId);
        return { ...selection, productIds: nextIds };
      }),
    );
  };

  const handleRemoveCoverageSelection = (key: string) => {
    setCoverageSelections((current) => {
      const next = current.filter((selection) => selection.key !== key);
      return next.length ? next : [createCoverageSelection('', [], 0)];
    });
  };


  const leadFollowUps = useMemo(
    () => followUps.filter((item) => item.lead_id === lead?.id),
    [followUps, lead?.id],
  );

  const leadActivities = useMemo(
    () => activities.filter((item) => item.lead_id === lead?.id),
    [activities, lead?.id],
  );

  const stageNameMap = useMemo(
    () => new Map(stages.map((stage) => [stage.id, stage.name])),
    [stages],
  );

  const wizardSteps = useMemo(() => (isEditingExistingLead && !isQuickMode ? [...LEAD_WIZARD_STEPS, LEAD_QUOTE_STEP] : LEAD_WIZARD_STEPS), [isEditingExistingLead, isQuickMode]);

  const panelTitle =
    title ??
    (isQuickMode
      ? 'Quick Add Lead'
      : isEditingExistingLead
        ? lead?.company_name ?? 'Lead details'
        : 'Full Add Lead');

  const activeStepIndex = Math.max(0, wizardSteps.findIndex((step) => step.id === activeStepId));
  const activeStep = wizardSteps[activeStepIndex] ?? wizardSteps[0];

  const initialLeadSnapshot = useMemo(() => normalizeLeadFormValues({
    leadType: lead?.lead_type ?? 'buyer',
    companyName: lead?.company_name ?? '',
    contactName: lead?.contact_name ?? '',
    email: lead?.email ?? '',
    phone: lead?.phone ?? '',
    tradeEventId: lead?.trade_event_id ?? '',
    pipelineId: lead?.pipeline_id ?? '',
    stageId: lead?.stage_id ?? '',
    countryId: lead?.country_id ?? '',
    followUpAt: toDatetimeLocalValue(lead?.next_follow_up_at) || defaultFollowUpLocal,
    nextStepId: defaultNextStepId,
    ownerUserId: defaultOwnerId,
    notes: lead?.notes ?? '',
    selectedMarketIds: [...selectedMarketIds].sort(),
    selectedCategoryIds: [...new Set(selectedProductIds.map((productId) => products.find((item) => item.id === productId)?.category_id ?? '').filter(Boolean))].sort(),
    selectedProductIds: [...selectedProductIds].sort(),
  }), [defaultFollowUpLocal, defaultNextStepId, defaultOwnerId, lead, products, selectedMarketIds, selectedProductIds]);

  const currentLeadSnapshot = useMemo(() => normalizeLeadFormValues({
    leadType,
    companyName,
    contactName,
    email,
    phone,
    tradeEventId,
    pipelineId,
    stageId,
    countryId,
    followUpAt,
    nextStepId,
    ownerUserId,
    notes,
    selectedMarketIds: [...selectedMarketIdSet].sort(),
    selectedCategoryIds: [...selectedCategoryIds].sort(),
    selectedProductIds: [...selectedProductIdSet].sort(),
  }), [leadType, companyName, contactName, email, phone, tradeEventId, pipelineId, stageId, countryId, followUpAt, nextStepId, ownerUserId, notes, selectedMarketIdSet, selectedCategoryIds, selectedProductIdSet]);

  const hasLeadChanges = !isEditingExistingLead || currentLeadSnapshot !== initialLeadSnapshot;

  const validateStep = (stepId: LeadWizardStepId, formData: FormData) => {
    const issues: string[] = [];

    if (stepId === 'basics') {
      const companyName = String(formData.get('company_name') ?? '').trim();
      const email = String(formData.get('email') ?? '').trim();
      if (!companyName) issues.push('Company name is required before you continue.');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        issues.push('Email must be valid when provided.');
      }
    }

    if (stepId === 'workflow') {
      const followUpAtValue = String(formData.get('next_follow_up_at') ?? '').trim();
      if (!followUpAtValue) issues.push('Follow-up date and time are required for every lead.');
      if (!isQuickMode && availablePipelines.length === 0) issues.push('At least one pipeline is required before saving this lead.');
      if (!isQuickMode && availableStages.length === 0) issues.push('At least one stage is required before saving this lead.');
    }

    return issues;
  };

  const moveToStep = (nextStepId: LeadWizardStepId) => {
    const currentIndex = wizardSteps.findIndex((step) => step.id === activeStepId);
    const nextIndex = wizardSteps.findIndex((step) => step.id === nextStepId);

    if (nextIndex <= currentIndex) {
      setValidationIssues([]);
      setActiveStepId(nextStepId);
      return true;
    }

    const formElement = formRef.current;
    if (!formElement) {
      setActiveStepId(nextStepId);
      return true;
    }

    const issues = validateStep(activeStepId, new FormData(formElement));
    setValidationIssues(issues);
    if (issues.length) return false;

    setState((current) => ({ ...current, error: undefined }));
    setActiveStepId(nextStepId);
    return true;
  };

  const handleNextStep = () => {
    const nextStep = wizardSteps[activeStepIndex + 1];
    if (!nextStep) return;
    moveToStep(nextStep.id as LeadWizardStepId);
  };

  const handlePreviousStep = () => {
    const previousStep = wizardSteps[activeStepIndex - 1];
    if (!previousStep) return;
    setValidationIssues([]);
    setActiveStepId(previousStep.id as LeadWizardStepId);
  };

  const handleOpenQuoteStep = (quoteId?: string | null) => {
    if (quoteId) setSelectedQuoteId(quoteId);
    if (isEditingExistingLead && !isQuickMode) {
      setValidationIssues([]);
      setActiveStepId('quotes');
    }
  };

  const handleReviewInDrawer = (quoteId?: string | null) => {
    handleOpenQuoteStep(quoteId);
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        quoteProductsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleQuoteSaved = (nextQuote: Quote) => {
    setQuoteRowsState((current) => {
      const withoutCurrent = current.filter((item) => item.id !== nextQuote.id);
      return [nextQuote, ...withoutCurrent];
    });
    setSelectedQuoteId(nextQuote.id);
    setQuoteEditorOpen(false);
    router.refresh();
  };

  const handleCreateQuote = () => {
    if (!lead?.id) {
      setQuoteActionError('Save the lead before creating a quote.');
      return;
    }

    handleOpenQuoteStep();
    setQuoteActionError(null);
    startTransition(() => {
      void openOrCreateLeadQuoteDraft(lead.id).then((result) => {
        if (result?.error) {
          setQuoteActionError(result.error);
          return;
        }
        setState((current) => ({ ...current, success: result.success ?? 'Quote workspace ready.' }));
        if (result?.quote) {
          setQuoteRowsState((current) => {
            const withoutCurrent = current.filter((item) => item.id !== result.quote.id);
            return [result.quote as Quote, ...withoutCurrent];
          });
        }
        if (result?.version) {
          setQuoteVersionRowsState((current) => {
            const withoutCurrent = current.filter((item) => item.id !== result.version.id);
            return [result.version as QuoteVersion, ...withoutCurrent];
          });
        }
        if (result?.quoteId) {
          setSelectedQuoteId(result.quoteId);
          if (onOpenInlineQuote) {
            onOpenInlineQuote(lead.id, result.quoteId);
            onClose?.();
            return;
          }
          setQuoteActionError('Inline quote handoff is not available from this drawer context. Open the quote from the Leads workspace.');
          return;
        }
        router.refresh();
      });
    });
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    formData.set('lead_type', leadType);
    formData.set('company_name', companyName);
    formData.set('contact_name', contactName);
    formData.set('job_title', jobTitle);
    formData.set('email', email);
    formData.set('phone', phone);
    formData.set('whatsapp_number', whatsappNumber);
    formData.set('phone_secondary', phoneSecondary);
    formData.set('website', website);
    formData.set('trade_event_id', tradeEventId);
    formData.set('next_follow_up_at', followUpAt);
    formData.set('next_step_id', nextStepId);
    formData.set('owner_user_id', ownerUserId);
    formData.set('notes', notes);
    formData.set('source_type', sourceType);
    formData.set('source_label', sourceLabel);
    const issues = validateStep(activeStepId, formData);

    setValidationIssues(issues);
    if (issues.length) return;

    if (isEditingExistingLead && !hasLeadChanges) {
      setState({ success: 'No changes to save.' });
      return;
    }

    startTransition(() => {
      void saveLead(undefined, formData).then((result) => {
        const nextState = result ?? {};
        setState(nextState);
        if (!nextState.success) return;

        const savedLead = nextState.lead;
        const nextAfterSaveGuidance = savedLead
          ? buildContactScanAfterSaveGuidance({
              lead: savedLead,
              ownerLabel: profiles.find((profile) => profile.id === ownerUserId)?.full_name ?? profiles.find((profile) => profile.id === ownerUserId)?.username ?? 'Lead owner',
              postApplyAssist,
            })
          : null;
        setAfterSaveGuidance(nextAfterSaveGuidance);

        const resetForNextLead = !isEditingExistingLead && isQuickMode && !shouldAutoOpenQuoteAfterSave;
        setValidationIssues([]);
        setActiveStepId('basics');

        if (shouldAutoOpenQuoteAfterSave && nextState.lead?.id) {
          const savedLeadId = nextState.lead.id;
          setState((current) => ({ ...current, success: 'Lead saved. Opening quote draft…' }));
          void openOrCreateLeadQuoteDraft(savedLeadId).then((quoteResult) => {
            if (quoteResult?.error) {
              setQuoteActionError(quoteResult.error);
              return;
            }
            if (onOpenInlineQuote) {
              onOpenInlineQuote(savedLeadId, quoteResult?.quoteId ?? null);
              onClose?.();
              return;
            }
            setQuoteActionError('Inline quote handoff is not available from this drawer context. Open the quote from the Leads workspace.');
            return;
          });
        }

        if (resetForNextLead) {
          formElement.reset();
          setLeadType('buyer');
          setCompanyName('');
          setContactName('');
          setJobTitle('');
          setEmail('');
          setPhone('');
          setPhoneSecondary('');
          setWebsite('');
          setTradeEventId(isFastFieldMode ? lead?.trade_event_id ?? '' : '');
          setPipelineId('');
          setStageId('');
          setCountryId('');
          setFollowUpAt(defaultFollowUpLocal || getDefaultFollowUpLocalValue());
          setNextStepId(defaultNextStepId);
          setOwnerUserId(defaultOwnerId);
          setCoverageSelections(prefilledProductIds.length ? [createCoverageSelection('', prefilledProductIds, 0)] : [createCoverageSelection('', [], 0)]);
          setSelectedMarketIdSet([]);
          setNotes('');
          setSourceType(prefill?.sourceType ?? '');
          setSourceLabel(prefill?.sourceLabel ?? '');
          setPostApplyAssist(null);
          companyInputRef.current?.focus();
        }

        onSaved?.({ resetForNextLead, lead: nextState.lead, selectedMarketIds: nextState.selectedMarketIds, selectedProductIds: nextState.selectedProductIds });
      });
    });
  };

  const quoteIds = new Set(quoteRowsState.map((quote) => quote.id));
  const quoteDocumentMap = documents.filter((document) => {
    const linkedQuoteId = document.linked_quote_id ?? null;
    return (linkedQuoteId && quoteIds.has(linkedQuoteId)) || (document.related_entity === 'quote' && document.related_id && quoteIds.has(document.related_id));
  });

  const leadQuoteVersions = quoteVersionRowsState.filter((version) => version.quote_id && quoteIds.has(version.quote_id));

  const quoteTimelineRows = [...quoteRowsState]
    .sort((left, right) => String(right.updated_at ?? '').localeCompare(String(left.updated_at ?? '')))
    .map((quote) => {
      const versions = leadQuoteVersions
        .filter((version) => version.quote_id === quote.id)
        .sort((left, right) => Number(right.version_no ?? 0) - Number(left.version_no ?? 0) || String(right.created_at ?? '').localeCompare(String(left.created_at ?? '')));
      const relatedDocuments = quoteDocumentMap
        .filter((document) => (document.linked_quote_id ?? document.related_id) === quote.id)
        .sort((left, right) => String(right.uploaded_at ?? '').localeCompare(String(left.uploaded_at ?? '')));
      const currentVersion = versions.find((version) => version.id === quote.current_version_id) ?? versions[0] ?? null;
      const latestDocument = currentVersion?.pdf_document_id
        ? relatedDocuments.find((document) => document.id === currentVersion.pdf_document_id) ?? relatedDocuments[0] ?? null
        : relatedDocuments[0] ?? null;
      return { quote, versions, relatedDocuments, currentVersion, latestDocument };
    });

  useEffect(() => {
    if (!quoteTimelineRows.length) {
      setSelectedQuoteId(null);
      return;
    }
    setSelectedQuoteId((current) => current && quoteTimelineRows.some((row) => row.quote.id === current) ? current : quoteTimelineRows[0]?.quote.id ?? null);
  }, [quoteTimelineRows]);

  const selectedQuoteRow = quoteTimelineRows.find((row) => row.quote.id === selectedQuoteId) ?? quoteTimelineRows[0] ?? null;
  const selectedQuoteWorkflow = useMemo(() => parseQuoteWorkflow(selectedQuoteRow?.quote.notes), [selectedQuoteRow?.quote.notes]);
  const selectedQuotePricingBasis = String(selectedQuoteWorkflow.meta?.pricingBasis ?? 'fob');

  const catalogProductOptions = useMemo(() => buildCatalogProductOptions({
    products: products.map((product) => ({ id: product.id, name: product.name })),
    variants,
    prices,
    rules: pricingRules,
    marketIds: selectedMarketIdSet,
    preferredCurrency: selectedQuoteRow?.quote.currency ?? lead?.deal_currency ?? null,
    preferredBasis: selectedQuotePricingBasis,
  }), [lead?.deal_currency, prices, pricingRules, products, selectedMarketIdSet, selectedQuotePricingBasis, selectedQuoteRow?.quote.currency, variants]);

  const catalogProductOptionMap = useMemo(() => new Map(catalogProductOptions.map((product) => [product.id, product])), [catalogProductOptions]);

  const selectedQuoteProducts = useMemo(() => {
    const selectedProductsFromCoverage = products.filter((product) => selectedProductIdSet.includes(product.id));
    if (!selectedQuoteRow) return selectedProductsFromCoverage.map((product) => ({ product, lineItem: null as QuoteLineItem | null }));

    const quoteLineItems = Array.isArray(selectedQuoteRow.quote.lineItems) ? selectedQuoteRow.quote.lineItems : [];
    const byProductId = new Map(quoteLineItems.filter((item) => item.product_id).map((item) => [String(item.product_id), item]));
    const orderedIds = Array.from(new Set([
      ...quoteLineItems.map((item) => String(item.product_id ?? '')).filter(Boolean),
      ...selectedProductIdSet,
    ]));

    return orderedIds.map((productId) => ({
      product: products.find((product) => product.id === productId) ?? null,
      lineItem: byProductId.get(productId) ?? null,
    })).filter((row) => row.product);
  }, [products, selectedProductIdSet, selectedQuoteRow]);

  if (!open) return null;

  const wizardSummary = validationIssues.length ? (
    <WizardValidationSummary issues={validationIssues} />
  ) : state.error ? (
    <WizardValidationSummary title="Unable to save lead" issues={[state.error]} />
  ) : state.success ? (
    <WizardValidationSummary title="Lead saved" issues={[state.success]} tone="success" />
  ) : (
    <WizardValidationSummary
      title="Guided workflow"
      issues={[
        'Progress stays step-by-step on desktop and mobile.',
        'Save is enabled only when there are changes to keep.',
      ]}
      tone="info"
    />
  );

  const quoteReviewPanel = isEditingExistingLead && !isQuickMode ? (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quote workflow</p>
          <p className="mt-2 text-sm text-slate-600">Quotes now live as a dedicated drawer step so you can review versions and documents directly inside the lead workflow.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenQuoteStep(selectedQuoteId)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Open quote step
        </button>
      </div>
      {quoteActionError ? <p className="mt-3 text-xs font-medium text-rose-600">{quoteActionError}</p> : null}
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
        {quoteTimelineRows.length
          ? `${quoteTimelineRows.length} quote${quoteTimelineRows.length === 1 ? '' : 's'} available. Use the Quotes step above to review and continue the commercial workflow.`
          : 'No quotes yet. Create a draft quote from the Quotes step or the drawer footer.'}
      </div>
    </div>
  ) : null;

  const wizardAside = (
    <>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead snapshot</p>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Journey</dt>
            <dd className="font-semibold capitalize text-slate-900">{leadType}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Owner</dt>
            <dd className="font-semibold text-slate-900">{profiles.find((profile) => profile.id === ownerUserId)?.full_name ?? profiles.find((profile) => profile.id === ownerUserId)?.username ?? 'Unassigned'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Follow-up</dt>
            <dd className="font-semibold text-slate-900">{formatLocalDateTimeValue(followUpAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Markets</dt>
            <dd className="font-semibold text-slate-900">{selectedMarketIdSet.length}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Products</dt>
            <dd className="font-semibold text-slate-900">{selectedProductIdSet.length}</dd>
          </div>
        </dl>
      </div>
      {isEditingExistingLead && !isQuickMode && lead ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Editing context</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{lead.company_name}</p>
          <p className="mt-1 text-sm text-slate-600">Use the final step to review the latest activity snapshot before saving changes.</p>
        </div>
      ) : null}
      {quoteReviewPanel}
    </>
  );



  const quoteEditorDrawer = selectedQuoteRow ? (
    <RightDrawer
      open={quoteEditorOpen}
      onClose={() => setQuoteEditorOpen(false)}
      title="Edit quote pricing"
      description="Adjust catalog-based pricing and overrides without leaving the buyer drawer."
      widthClassName="sm:max-w-3xl lg:max-w-6xl"
    >
      <QuoteEditWizardForm
        key={selectedQuoteRow.quote.id}
        quote={selectedQuoteRow.quote as any}
        products={catalogProductOptions as any}
        quoteVersions={quoteVersionRowsState.filter((version) => version.quote_id === selectedQuoteRow.quote.id) as any}
        onClose={() => setQuoteEditorOpen(false)}
        onSaved={(record) => handleQuoteSaved(record as Quote)}
      />
    </RightDrawer>
  ) : null;

  const panel = (
    <form ref={formRef} id="lead-drawer-form" className="flex min-h-full flex-col" onSubmit={handleFormSubmit}>
      <input type="hidden" name="lead_id" value={lead?.id ?? ''} />
      <input type="hidden" name="lead_type" value={leadType} />
      <input type="hidden" name="company_name" value={companyName} />
      <input type="hidden" name="contact_name" value={contactName} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="whatsapp_number" value={whatsappNumber} />
      <input type="hidden" name="trade_event_id" value={tradeEventId} />
      <input type="hidden" name="pipeline_id" value={pipelineId} />
      <input type="hidden" name="stage_id" value={stageId} />
      <input type="hidden" name="country_id" value={countryId} />
      <input type="hidden" name="country" value={selectedCountry?.name ?? lead?.country ?? ''} />
      <input type="hidden" name="next_follow_up_at" value={followUpAt} />
      <input type="hidden" name="next_step_id" value={nextStepId} />
      <input type="hidden" name="owner_user_id" value={ownerUserId} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="phone_country_code" value={selectedPhoneCode} />
      <input
        type="hidden"
        name="phone_secondary_country_code"
        value={lead?.phone_secondary_country_code ?? selectedPhoneCode ?? ''}
      />
      <input type="hidden" name="source_type" value={sourceType} />
      <input type="hidden" name="source_label" value={sourceLabel} />
      <input type="hidden" name="deal_value" value={lead?.deal_value ?? ''} />
      <input type="hidden" name="deal_currency" value={lead?.deal_currency ?? ''} />
      <input type="hidden" name="intro_sent" value={lead?.intro_sent ? 'true' : 'false'} />
      <input type="hidden" name="job_title" value={jobTitle} />
      <input type="hidden" name="phone_secondary" value={phoneSecondary} />
      <input type="hidden" name="website" value={website} />
      <input type="hidden" name="social_handle" value={lead?.social_handle ?? ''} />

      {selectedMarketIdSet.map((marketId) => (
        <input key={marketId} type="hidden" name="market_ids" value={marketId} />
      ))}
      {selectedProductIdSet.map((productId) => (
        <input key={productId} type="hidden" name="product_ids" value={productId} />
      ))}
      {selectedCategoryIds.map((categoryId) => (
        <input key={categoryId} type="hidden" name="category_ids" value={categoryId} />
      ))}

      <div className="space-y-5 px-5 py-5">
        {/* ── SCAN CAPTURE HERO — spec: Quick Lead opens with scan as primary action ── */}
        {!isEditingExistingLead && isQuickMode && !isFastFieldMode ? (
          <div style={{ borderRadius: '16px', border: '1px solid #e0f2fe', background: 'linear-gradient(135deg,#f0f9ff 0%,#f8fafc 100%)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div>
                <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#0c7fff', marginBottom: '4px' }}>Smart capture</p>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', letterSpacing: '-.2px' }}>Scan a business card, document or PDF</h3>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', lineHeight: 1.5 }}>Use your camera or upload a file — the AI will extract and prefill the form fields automatically.</p>
              </div>
              <span style={{ borderRadius: '999px', border: '1px solid #bae6fd', background: 'white', padding: '3px 10px', fontSize: '10px', fontWeight: 700, color: '#0369a1', letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>AI-powered OCR</span>
            </div>
            {/* Scan method buttons — camera + file */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <label
                htmlFor="ql-camera-input"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', background: '#0b2e4a', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none' }}
              >
                📷 Use camera
                <input
                  id="ql-camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // Dispatch to the ContactScanTrigger via hidden file input below
                    const hidden = document.getElementById('ql-hidden-upload') as HTMLInputElement | null;
                    if (hidden) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      hidden.files = dt.files;
                      hidden.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }}
                />
              </label>
              <label
                htmlFor="ql-file-input"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#334155', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                📄 Upload file or PDF
                <input
                  id="ql-file-input"
                  type="file"
                  accept="image/*,.pdf,text/plain,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const hidden = document.getElementById('ql-hidden-upload') as HTMLInputElement | null;
                    if (hidden) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      hidden.files = dt.files;
                      hidden.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }}
                />
              </label>
              <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '10px', color: '#94a3b8', gap: '4px' }}>
                Supports: JPG, PNG, PDF, TXT · Max 10 MB
              </span>
            </div>
            <p style={{ marginTop: '10px', fontSize: '10px', color: '#94a3b8', letterSpacing: '.02em' }}>
              📌 Or fill the form below manually — scan is optional
            </p>
          </div>
        ) : null}

        {!isEditingExistingLead && prefill ? (
          <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Fast capture lane</p>
                <h3 className="mt-2 text-base font-semibold text-slate-900">{prefill.title ?? 'Quick lead'}</h3>
                <p className="mt-1 text-sm text-slate-600">{prefill.description ?? 'Save the minimum valid lead, keep the sales process compact, and move into Quote quickly.'}</p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">{shouldAutoOpenQuoteAfterSave ? 'Quote opens after save' : 'Quick save'}</span>
            </div>
          </div>
        ) : null}
        {afterSaveGuidance ? (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">After-save guidance</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">Lightweight next-step nudges are now available for this newly saved contact-scan lead</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{afterSaveGuidance.summary}</p>
              </div>
              <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">{afterSaveGuidance.statusLabel}</span>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-[1.15fr,0.85fr]">
              <div className="rounded-[1.25rem] border border-white bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Role-aware and lead-type-aware guidance</p>
                    <h4 className="mt-2 text-base font-semibold text-slate-900">{afterSaveGuidance.roleLens.label}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{afterSaveGuidance.roleLens.summary}</p><p className="mt-2 text-sm leading-6 text-slate-500">{afterSaveGuidance.leadTypeLens}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Preferred channel: {afterSaveGuidance.roleLens.preferredChannel}</span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Recommended owner</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{afterSaveGuidance.roleLens.recommendedOwner}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Why this is relevant</p>
                    <p className="mt-2 text-sm text-slate-700">{afterSaveGuidance.roleLens.reason}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Relevance signals</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {afterSaveGuidance.relevanceSignals.map((signal) => (
                      <span key={signal} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700">{signal}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-white bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">After-save guardrails</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  {afterSaveGuidance.guardrails.map((guardrail) => <li key={guardrail}>{guardrail}</li>)}
                </ul>
              </div>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr,0.95fr]">
              <div className="rounded-[1.25rem] border border-white bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Lead-type-aware outreach suggestions</p>
                    <h4 className="mt-2 text-base font-semibold text-slate-900">Outreach suggestions that stay lightweight after manual save</h4>
                  </div>
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Lead-type-aware outreach suggestions</span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {afterSaveGuidance.outreachSuggestions.map((suggestion) => (
                    <article key={suggestion.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">{suggestion.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{suggestion.messageAngle}</p>
                      <div className="mt-3 space-y-1 text-[12px] text-slate-500">
                        <p><strong className="text-slate-700">Timing:</strong> {suggestion.timing}</p>
                        <p><strong className="text-slate-700">Recommended owner:</strong> {suggestion.recommendedOwner}</p>
                        <p><strong className="text-slate-700">Recommended channel:</strong> {suggestion.recommendedChannel}</p>
                        <p><strong className="text-slate-700">Why relevant:</strong> {suggestion.whyRelevant}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-white bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">vCard-assisted first-touch recommendations</p>
                <h4 className="mt-2 text-base font-semibold text-slate-900">{afterSaveGuidance.vcardAssist.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">{afterSaveGuidance.vcardAssist.recommendation}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Preferred moment</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{afterSaveGuidance.vcardAssist.preferredMoment}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Channel</p>
                    <p className="mt-2 text-sm text-slate-700">{afterSaveGuidance.vcardAssist.channel}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Why this helps</p>
                  <p className="mt-2 text-sm text-slate-700">{afterSaveGuidance.vcardAssist.whyItHelps}</p>
                </div>
                <div className="mt-4 rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Capture-to-share loop closure</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{afterSaveGuidance.exchangeLoopSummary}</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {afterSaveGuidance.contactReuseHooks.map((hook) => (
                      <article key={hook.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-900">{hook.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{hook.detail}</p>
                        <div className="mt-3 space-y-1 text-[12px] text-slate-500">
                          <p><strong className="text-slate-700">Timing:</strong> {hook.timing}</p>
                          <p><strong className="text-slate-700">Why:</strong> {hook.reason}</p>
                        </div>
                        <Link href={hook.href} className="mt-3 inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                          {hook.actionLabel}
                        </Link>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-white bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Outbound vCard integration moments</p>
                  <h4 className="mt-2 text-base font-semibold text-slate-900">Use My Digital vCard at the exact moments capture turns into outreach</h4>
                </div>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">No second workflow</span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {afterSaveGuidance.vcardIntegrationMoments.map((moment) => (
                  <article key={moment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{moment.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{moment.detail}</p>
                    <div className="mt-3 space-y-1 text-[12px] text-slate-500">
                      <p><strong className="text-slate-700">Timing:</strong> {moment.timing}</p>
                      <p><strong className="text-slate-700">Why:</strong> {moment.reason}</p>
                    </div>
                    <Link href={moment.href} className="mt-3 inline-flex items-center rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">
                      {moment.actionLabel}
                    </Link>
                  </article>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
              {afterSaveGuidance.nextStepNudges.map((nudge) => (
                <article key={nudge.id} className="rounded-[1.25rem] border border-white bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{nudge.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${nudge.emphasis === 'do_now' ? 'bg-rose-50 text-rose-700' : nudge.emphasis === 'next' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{nudge.emphasis === 'do_now' ? 'Do now' : nudge.emphasis === 'next' ? 'Next' : 'Optional'}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{nudge.detail}</p>
                  <div className="mt-3 space-y-2 text-[12px] text-slate-500">
                    <p><strong className="text-slate-700">Timing:</strong> {nudge.timing}</p>
                    <p><strong className="text-slate-700">Recommended owner:</strong> {nudge.recommendedOwner}</p>
                    <p><strong className="text-slate-700">Preferred channel:</strong> {nudge.preferredChannel}</p>
                    <p><strong className="text-slate-700">Why relevant:</strong> {nudge.whyRelevant}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        {/* ── QUICK MODE: compact single-screen form matching spec HTML drawer ── */}
        {isQuickMode && !isEditingExistingLead ? (
          <div className="space-y-4">
            {isFastFieldMode ? (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Trade show fast field</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Save the contact in 30 seconds</h3>
                <p className="mt-1 text-sm text-emerald-800">Company, contact, and product interest stay up front. Add the rest only when there is time.</p>
              </div>
            ) : null}

            {isFastFieldMode ? (
              <div className="space-y-3">
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Company name *</span>
                  <input
                    name="company_name"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="e.g. Metro Retail GmbH"
                    required
                    ref={companyInputRef}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contact name</span>
                  <input
                    name="contact_name"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    placeholder="Primary contact person"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Product interest</span>
                  <select
                    value={selectedProductIdSet[0] ?? ''}
                    onChange={(event) => handleFastFieldProductChange(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Select product interest…</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}{product.sku ? ` · ${product.sku}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setShowFastFieldDetails((current) => !current)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {showFastFieldDetails ? 'Hide extra details' : 'Add more details'}
                </button>
              </div>
            ) : null}

            {(!isFastFieldMode || showFastFieldDetails) ? (
              <>
            {/* Lead type switch */}
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Lead type</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['buyer', 'supplier'] as const).map((type) => (
                  <button key={type} type="button" onClick={() => setLeadType(type)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${leadType === type ? (type === 'buyer' ? '#7dd3fc' : '#c4b5fd') : '#e2e8f0'}`, background: leadType === type ? (type === 'buyer' ? '#f0f9ff' : '#f5f3ff') : 'white', color: leadType === type ? (type === 'buyer' ? '#0369a1' : '#6d28d9') : '#64748b', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
                  >
                    {type === 'buyer' ? '🛒 Buyer' : '🏭 Supplier'}<br />
                    <span style={{ fontSize: '10px', fontWeight: 500 }}>{type === 'buyer' ? 'Importing / purchasing' : 'Sourcing / manufacturing'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Company & contact */}
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Company &amp; contact</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Company name *</label>
                  <input name="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Metro Retail GmbH" required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Country *</label>
                  <select name="country_id" value={countryId} onChange={(e) => setCountryId(e.target.value)} required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#f8fafc', color: '#1e293b', appearance: 'none' }}
                  >
                    <option value="">Select country…</option>
                    {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Contact name</label>
                  <input name="contact_name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Primary contact person"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Job title</label>
                  <input name="job_title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Procurement Director"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Email</label>
                  <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@company.com"
                    style={{ width: '100%', minHeight: '44px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginTop: '8px', marginBottom: '4px' }}>📱 WhatsApp</label>
                  <input name="whatsapp_number" inputMode="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+91 98765 43210"
                    style={{ width: '100%', minHeight: '44px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Phone</label>
                  <input name="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+49 151…"
                    style={{ width: '100%', minHeight: '44px', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Source & pipeline */}
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Source &amp; pipeline</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Lead source</label>
                  <select name="source_type" value={sourceType} onChange={(e) => setSourceType(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#f8fafc', color: '#1e293b', appearance: 'none' }}
                  >
                    <option value="trade_show">Trade show</option>
                    <option value="direct_inquiry">Direct inquiry</option>
                    <option value="referral">Referral</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="website">Website</option>
                    <option value="contact_scan_upload">vCard scan</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Event / source label</label>
                  <input name="source_label" value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="e.g. FoodEx Japan 2025"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Owner</label>
                  <select name="owner_user_id" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#f8fafc', color: '#1e293b', appearance: 'none' }}
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name ?? p.username ?? 'Unassigned'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Deal value estimate</label>
                  <input name="deal_value_estimate" type="number" placeholder="e.g. 50000"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 500, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Next follow-up */}
            <div>
              <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Next action</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>Next follow-up</label>
                  <input name="follow_up_at" type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#64748b', display: 'block', marginBottom: '4px' }}>After save</label>
                  <select value={shouldAutoOpenQuoteAfterSave ? 'quote' : 'stay'}
                    onChange={(e) => setAutoOpenQuoteAfterSave(e.target.value === 'quote')}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', background: '#f8fafc', color: '#1e293b', appearance: 'none' }}
                  >
                    <option value="stay">Stay in Follow-up</option>
                    <option value="quote">Open Quote Builder after save</option>
                  </select>
                </div>
              </div>
            </div>

              </>
            ) : null}

            {/* Validation */}
            {validationIssues.length > 0 ? (
              <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fff1f2', border: '1px solid #fecaca', fontSize: '12px', color: '#b91c1c', fontWeight: 600 }}>{validationIssues[0]}</div>
            ) : null}
          </div>
        ) : (
        <WizardShell
          steps={wizardSteps}
          activeStepId={activeStepId}
          onStepChange={(stepId) => moveToStep(stepId as LeadWizardStepId)}
          summary={wizardSummary}
        >
          {activeStepId === 'basics' ? (
            <WizardStepBody
              title="Lead basics"
              description="Start with the minimum valid lead. The next action stays visible immediately so the operator does not need to read through the full drawer before acting."
              aside={wizardAside}
            >
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Capture now</p>
                    <h3 className="mt-2 text-base font-semibold text-slate-900">Enter the minimum valid lead and save before anything else competes for attention</h3>
                    <p className="mt-1 text-sm text-slate-700">Start with company, contact, and country. Workflow, ownership, and coverage stay in the next steps so the first save feels immediate.</p>
                  </div>
                  <span className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">One obvious next move: save basics</span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[1.25rem] border border-white/80 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Do this first</p>
                    <ol className="mt-3 space-y-2 text-sm text-slate-700">
                      <li><span className="font-semibold text-slate-900">1.</span> Add company and contact.</li>
                      <li><span className="font-semibold text-slate-900">2.</span> Confirm country so downstream defaults stay explainable.</li>
                      <li><span className="font-semibold text-slate-900">3.</span> Save basics, then move to workflow and owner.</li>
                    </ol>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-2xl border border-white/80 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Where am I</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">Lead entry</p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">What blocks save</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">Missing company, contact, or country</p>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">What happens after save</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">Owner and next-step routing open next</p>
                    </div>
                  </div>
                </div>
              </div>
              <LeadBasicInfoSection
                currentLeadId={lead?.id ?? ''}
                leadType={leadType}
                setLeadType={setLeadType}
                tradeEvents={tradeEvents}
                companyName={companyName}
                setCompanyName={setCompanyName}
                contactName={contactName}
                setContactName={setContactName}
                jobTitle={jobTitle}
                setJobTitle={setJobTitle}
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                phoneSecondary={phoneSecondary}
                setPhoneSecondary={setPhoneSecondary}
                website={website}
                setWebsite={setWebsite}
                notes={notes}
                setNotes={setNotes}
                setSourceType={setSourceType}
                setSourceLabel={setSourceLabel}
                tradeEventId={tradeEventId}
                setTradeEventId={setTradeEventId}
                companyInputRef={companyInputRef}
                inputClassName={inputClassName}
                countries={availableCountries}
                countryId={countryId}
                setCountryId={setCountryId}
                showNewCountryForm={showNewCountryForm}
                setShowNewCountryForm={setShowNewCountryForm}
                markets={markets}
                newCountryName={newCountryName}
                setNewCountryName={setNewCountryName}
                newCountryIso2={newCountryIso2}
                setNewCountryIso2={setNewCountryIso2}
                newCountryIso3={newCountryIso3}
                setNewCountryIso3={setNewCountryIso3}
                newCountryPhone={newCountryPhone}
                setNewCountryPhone={setNewCountryPhone}
                newCountryMarketId={newCountryMarketId}
                setNewCountryMarketId={setNewCountryMarketId}
                onAddCountry={handleAddCountry}
                postApplyAssist={postApplyAssist}
                setPostApplyAssist={setPostApplyAssist}
                clearAfterSaveGuidance={() => setAfterSaveGuidance(null)}
              />
            </WizardStepBody>
          ) : null}

          {activeStepId === 'workflow' ? (
            <WizardStepBody
              title="Workflow and ownership"
              description="Set owner, stage, and next action for this lead."
              aside={wizardAside}
            >
              <LeadStageSection
                isQuickMode={isQuickMode}
                availablePipelines={availablePipelines}
                pipelineId={pipelineId}
                setPipelineId={setPipelineId}
                availableStages={availableStages}
                stageId={stageId}
                setStageId={setStageId}
                followUpAt={followUpAt}
                setFollowUpAt={setFollowUpAt}
                nextSteps={nextSteps}
                nextStepId={nextStepId}
                setNextStepId={setNextStepId}
                profiles={profiles}
                ownerUserId={ownerUserId}
                setOwnerUserId={setOwnerUserId}
                inputClassName={inputClassName}
              />
            </WizardStepBody>
          ) : null}

          {activeStepId === 'coverage' ? (
            <WizardStepBody
              title="Coverage and notes"
              description={
                isQuickMode
                  ? 'Finish with notes and context while keeping quick capture lean.'
                  : 'Finish with market, product, and note context before saving.'
              }
              aside={wizardAside}
            >
              <div className="space-y-5">
                {isQuickMode ? (
                  <label className="flex items-start gap-3 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                    <input
                      type="checkbox"
                      checked={autoOpenQuoteAfterSave}
                      onChange={(event) => setAutoOpenQuoteAfterSave(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>
                      <span className="block font-semibold">Open Quote Builder after saving this lead?</span>
                      <span className="mt-1 block text-emerald-700">Use when buyer/supplier type, products, market coverage, and follow-up date are ready enough for the quote checklist.</span>
                    </span>
                  </label>
                ) : null}
                <ProductMarketsSection
                  categoryTree={categoryTree}
                  coverageSelections={coverageSelections}
                  onAddCoverageSelection={handleAddCoverageSelection}
                  onChangeCoverageCategory={handleCoverageCategoryChange}
                  onToggleCoverageProduct={handleToggleCoverageProduct}
                  onRemoveCoverageSelection={handleRemoveCoverageSelection}
                  products={products}
                  markets={markets}
                  countries={countries}
                  countryId={countryId}
                  selectedMarketIdSet={selectedMarketIdSet.filter((marketId) => marketId !== autoMarketId)}
                  setSelectedMarketIdSet={setSelectedMarketIdSet}
                  showNewMarketForm={showNewMarketForm}
                  setShowNewMarketForm={setShowNewMarketForm}
                  newMarketName={newMarketName}
                  setNewMarketName={setNewMarketName}
                  newMarketCode={newMarketCode}
                  setNewMarketCode={setNewMarketCode}
                  inputClassName={inputClassName}
                  notesValue={notes}
                  onNotesChange={setNotes}
                  showInterestSelectors={true}
                  onAddMarket={handleAddMarket}
                />

                {isEditingExistingLead && !isQuickMode && lead ? (
                  <LeadRecentSection
                    lead={{
                      id: lead.id,
                      company_name: lead.company_name,
                      created_at: lead.created_at ?? null,
                      updated_at: lead.updated_at ?? null,
                      notes: lead.notes ?? null,
                    }}
                    followUps={leadFollowUps}
                    activities={leadActivities}
                    stageHistory={stageHistory}
                    rfqs={rfqs}
                    quotes={quotes}
                    complianceItems={complianceItems}
                    complianceDefinitions={complianceDefinitions}
                    stageNameMap={stageNameMap}
                  />
                ) : null}
              </div>
            </WizardStepBody>
          ) : null}

          {activeStepId === 'quotes' ? (
            <WizardStepBody
              title="Quote review"
              description="Create and review quotes directly inside the lead drawer inside the lead drawer as part of the guided workflow."
              aside={wizardAside}
            >
              <div className="space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quote control</p>
                      <h4 className="mt-2 text-base font-semibold text-slate-900">Quotes stay in the lead workflow</h4>
                      <p className="mt-2 text-sm text-slate-600">Create a draft quote, review version history, and confirm the latest customer-ready document without leaving this drawer step.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCreateQuote}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        {quoteTimelineRows.length ? 'Create another draft quote' : 'Create draft quote'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenQuoteStep(selectedQuoteRow?.quote.id ?? null)}
                        className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Keep in drawer
                      </button>
                    </div>
                  </div>
                  {quoteActionError ? <p className="mt-3 text-xs font-medium text-rose-600">{quoteActionError}</p> : null}
                </div>

                {quoteTimelineRows.length ? (
                  <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead quotes</p>
                      <div className="mt-3 space-y-3">
                        {quoteTimelineRows.map(({ quote, versions, latestDocument }) => {
                          const isSelected = selectedQuoteRow?.quote.id === quote.id;
                          return (
                            <button
                              key={quote.id}
                              type="button"
                              onClick={() => setSelectedQuoteId(quote.id)}
                              className={[
                                'w-full rounded-2xl border px-3 py-3 text-left transition',
                                isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]' : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
                              ].join(' ')}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className={[ 'text-sm font-semibold', isSelected ? 'text-white' : 'text-slate-900' ].join(' ')}>{quote.quote_number ?? `Quote ${quote.id.slice(0, 8)}`}</p>
                                  <p className={[ 'mt-1 text-xs', isSelected ? 'text-slate-200' : 'text-slate-500' ].join(' ')}>{String(quote.status ?? 'draft').replace(/_/g, ' ')} · {versions.length} version{versions.length === 1 ? '' : 's'}</p>
                                </div>
                                <span className={[ 'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', isSelected ? 'bg-white/15 text-white' : 'bg-white text-slate-600 border border-slate-200' ].join(' ')}>{latestDocument?.file_name ? 'PDF ready' : 'No PDF'}</span>
                              </div>
                              <p className={[ 'mt-2 text-xs', isSelected ? 'text-slate-200' : 'text-slate-500' ].join(' ')}>Updated {formatLocalDateTimeValue(quote.updated_at)}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
                      {selectedQuoteRow ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected quote</p>
                              <h4 className="mt-2 text-base font-semibold text-slate-900">{selectedQuoteRow.quote.quote_number ?? `Quote ${selectedQuoteRow.quote.id.slice(0, 8)}`}</h4>
                              <p className="mt-1 text-sm text-slate-600">Updated {formatLocalDateTimeValue(selectedQuoteRow.quote.updated_at)} · {String(selectedQuoteRow.quote.status ?? 'draft').replace(/_/g, ' ')}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => setQuoteEditorOpen(true)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Edit pricing</button>
                              <button type="button" onClick={() => { if (lead?.id && onOpenInlineQuote) { onOpenInlineQuote(lead.id, selectedQuoteRow.quote.id); onClose?.(); } else { setQuoteActionError('Inline quote handoff is not available from this drawer context. Open the quote from the Leads workspace.'); } }} disabled={!lead?.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Open in Leads Quote Builder</button>
                            </div>
                          </div>

                          <div className="grid gap-3 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest document</p>
                              <p className="mt-2 font-medium text-slate-900">{selectedQuoteRow.latestDocument?.file_name ?? 'No linked quote PDF yet'}</p>{!selectedQuoteRow.latestDocument?.file_name ? <p className="mt-2 text-xs text-slate-500">Draft PDF is not auto-linked on draft creation. Use Open quote page to preview or print the draft.</p> : null}
                              <p className="mt-1 text-xs text-slate-500">Current version {selectedQuoteRow.currentVersion?.version_no ?? 'pending sync'}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workflow state</p>
                              <p className="mt-2 font-medium text-slate-900">{String(selectedQuoteRow.quote.status ?? 'draft').replace(/_/g, ' ')}</p>
                              <p className="mt-1 text-xs text-slate-500">{selectedQuoteRow.versions.filter((version) => version.approved_at).length} approved version(s) · {selectedQuoteRow.versions.filter((version) => version.sent_at).length} sent version(s)</p>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Version history</p>
                            <div className="mt-3 space-y-2">
                              {selectedQuoteRow.versions.length ? selectedQuoteRow.versions.map((version) => (
                                <div key={version.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <p className="font-semibold text-slate-900">v{version.version_no ?? '—'} · {String(version.status ?? 'draft').replace(/_/g, ' ')}</p>
                                      <p className="mt-1 text-xs text-slate-500">{formatLocalDateTimeValue(version.sent_at ?? version.approved_at ?? version.created_at)}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                      <span>{version.approved_at ? 'Approved' : 'Awaiting approval'}</span>
                                      <span>{version.sent_at ? 'Sent' : 'Not sent'}</span>
                                    </div>
                                  </div>
                                </div>
                              )) : <p className="text-sm text-slate-500">No quote versions synced yet.</p>}
                            </div>
                          </div>

                          <div ref={quoteProductsRef} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Quote products</p>
                                <p className="mt-1 text-sm text-slate-600">Products selected in Coverage are seeded into the draft quote so commercial review can continue here.</p>
                              </div>
                            </div>
                            <div className="mt-3 space-y-2">
                              {selectedQuoteProducts.length ? selectedQuoteProducts.map(({ product, lineItem }) => product ? (() => {
                                const catalogProduct = catalogProductOptionMap.get(product.id);
                                const catalogCurrency = lineItem?.catalog_price_currency ?? catalogProduct?.catalogPriceCurrency ?? lineItem?.currency ?? selectedQuoteRow.quote.currency ?? 'USD';
                                const catalogPrice = typeof lineItem?.catalog_price_amount === 'number' ? lineItem.catalog_price_amount : catalogProduct?.catalogPriceAmount ?? null;
                                const finalPrice = typeof lineItem?.unit_price === 'number' ? lineItem.unit_price : catalogPrice;
                                return (
                                <div key={product.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="font-semibold text-slate-900">{product.name}</p>
                                      <p className="mt-1 text-xs text-slate-500">SKU {product.sku ?? '—'} · {lineItem ? 'Seeded in quote' : 'Selected in coverage'}</p>
                                    </div>
                                    <span className={['rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', lineItem ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'].join(' ')}>{lineItem ? 'In quote' : 'Needs sync'}</span>
                                  </div>
                                  <div className="mt-2 grid gap-2 lg:grid-cols-4 text-xs">
                                    <div className="rounded-lg bg-slate-50 px-2 py-2">Qty: <span className="font-semibold text-slate-900">{lineItem?.quantity ?? catalogProduct?.moqValue ?? 1}</span></div>
                                    <div className="rounded-lg bg-slate-50 px-2 py-2">Currency: <span className="font-semibold text-slate-900">{catalogCurrency}</span></div>
                                    <div className="rounded-lg bg-slate-50 px-2 py-2">Base price: <span className="font-semibold text-slate-900">{typeof catalogPrice === 'number' ? `${catalogCurrency} ${catalogPrice.toFixed(2)}${catalogProduct?.pricingModeDefault === 'kg' ? ' / kg' : ' / case'}` : 'Missing catalog price'}</span></div>
                                    <div className="rounded-lg bg-slate-50 px-2 py-2">Quote price: <span className="font-semibold text-slate-900">{typeof finalPrice === 'number' ? `${catalogCurrency} ${finalPrice.toFixed(2)}${catalogProduct?.pricingModeDefault === 'kg' ? ' / kg' : ' / case'}` : 'Needs pricing'}</span></div>
                                  </div>
                                </div>
                              );
                              })() : null) : <p className="text-sm text-slate-500">No products are selected in Coverage yet. Go back to the Coverage step to add products for this buyer.</p>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">Select a quote to review the latest versions and customer-ready documents.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-5 text-sm text-slate-600">No quotes yet. Use Create draft quote to start the commercial workflow from this lead.</div>
                )}
              </div>
            </WizardStepBody>
          ) : null}
        </WizardShell>
        )}
      </div>
    </form>
  );

  const headerActions =
    !isQuickMode && isEditingExistingLead ? (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {navigationMeta ?? 'Use Alt + ← / Alt + → to move between visible leads.'}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onNavigatePrev}
            disabled={!canNavigatePrev}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous lead
          </button>
          <button
            type="button"
            onClick={onNavigateNext}
            disabled={!canNavigateNext}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next lead
          </button>
        </div>
      </div>
    ) : undefined;

  return (
    <RightDrawer
      open={open}
      onClose={onClose ?? (() => {})}
      title={panelTitle}
      widthClassName={isQuickMode && !isEditingExistingLead ? 'max-w-[540px]' : 'max-w-5xl'}
      headerActions={headerActions}
      footer={
        <LeadDrawerFooter
          error={state.error ?? quoteActionError ?? undefined}
          success={state.success}
          isQuickMode={isQuickMode}
          isEditingExistingLead={isEditingExistingLead}
          isPending={isPending}
          onCancel={onClose}
          onCreateQuote={quoteTimelineRows.length ? undefined : handleCreateQuote}
          formId="lead-drawer-form"
          wizard={{
            activeStepIndex,
            totalSteps: wizardSteps.length,
            activeStepTitle: activeStep.title,
            canGoBack: activeStepIndex > 0,
            canGoNext: activeStepIndex < wizardSteps.length - 1,
            onBack: handlePreviousStep,
            onNext: handleNextStep,
          }}
          disableSubmit={isEditingExistingLead && !hasLeadChanges}
          submitLabel={isFastFieldMode ? 'Save contact' : undefined}
        />
      }
    >
      {panel}
      {quoteEditorDrawer}
    </RightDrawer>
  );
}