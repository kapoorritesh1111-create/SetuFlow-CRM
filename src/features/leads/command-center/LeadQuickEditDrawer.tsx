'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProduct } from '@/features/products/api/create-product'
import { getProductOptions, type ProductCategoryOption } from '@/features/products/api/get-product-options'
import {
  completeLeadFollowUp,
  openOrCreateLeadQuoteDraft,
  recordLeadCommunicationSent,
  recordLeadQuoteApprovalRequest,
  saveLeadCoverage,
  saveLeadDetails,
  scheduleLeadFollowUp,
  updateLeadQualification,
} from '@/features/leads/server/actions'
import type { LeadQualificationStatus } from '@/lib/lead-workflow'
import { navigateToLeadCommandCenter } from '@/lib/lead-command-center-navigation'
import { formatDateTime } from '@/lib/utils'

type ProductOption = { id: string; name: string; categoryName?: string | null }
type MarketOption = { id: string; name: string }

type OpItem = {
  kind: 'sent' | 'approval_request' | 'quote_ready' | 'coverage_saved' | 'follow_up' | 'qualification'
  label: string
  detail?: string | null
  happenedAt: string
  statusTone?: 'blue' | 'emerald' | 'amber'
  quoteId?: string | null
  quoteNumber?: string | null
}

type LeadLite = {
  id: string
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  country?: string | null
  ownerName?: string | null
  sourceLabel?: string | null
  leadType?: 'buyer' | 'supplier'
}

export type LeadQuickEditDrawerSection = 'details' | 'coverage' | 'workflow' | 'outreach' | 'quote'

type Props = {
  open?: boolean
  onClose?: () => void
  lead: LeadLite
  availableProducts: ProductOption[]
  availableMarkets: MarketOption[]
  selectedProductIds: string[]
  selectedMarketIds: string[]
  quoteWorkspaceHref: string
  quoteCount: number
  latestQuoteNumber?: string | null
  pendingFollowUpId?: string | null
  nextFollowUpAt?: string | null
  openFollowUpCount?: number
  overdueFollowUpCount?: number
  dueSoonFollowUpCount?: number
  qualificationStatus?: LeadQualificationStatus
  qualificationNotes?: string | null
  initialSection?: LeadQuickEditDrawerSection
  onLeadUpdated?: (patch: Partial<LeadLite>) => void
  onCoverageSaved?: (payload: { productIds: string[]; marketIds: string[] }) => void
  onProductCreated?: (product: ProductOption) => void
  onWorkflowUpdated?: (payload: {
    qualificationStatus?: LeadQualificationStatus
    qualificationNotes?: string | null
    nextFollowUpAt?: string | null
    pendingFollowUpId?: string | null
    openFollowUpCount?: number
    overdueFollowUpCount?: number
    dueSoonFollowUpCount?: number
  }) => void
  onOperationLogged?: (item: OpItem) => void
  onQuoteReady?: (payload: { quoteId?: string | null; quoteNumber?: string | null; quoteCountDelta?: number }) => void
}

const BASE_SECTION_LABELS: Array<{ id: Exclude<LeadQuickEditDrawerSection, 'quote'>; label: string }> = [
  { id: 'details', label: 'Lead details' },
  { id: 'coverage', label: 'Coverage' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'outreach', label: 'AI outreach' },
]

function getSectionLabels(hasActiveQuote: boolean): Array<{ id: LeadQuickEditDrawerSection; label: string }> {
  return hasActiveQuote
    ? [...BASE_SECTION_LABELS, { id: 'quote', label: 'Quote ops' }]
    : BASE_SECTION_LABELS
}

const QUALIFICATION_OPTIONS: Array<{ value: LeadQualificationStatus; label: string }> = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_review', label: 'In review' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Disqualified' },
]

function buildTemplate(kind: 'introduction' | 'follow_up' | 'quote_message', companyName: string) {
  if (kind === 'introduction') {
    return {
      subject: `Introduction for ${companyName}`,
      body: `Hi team,\n\nThis is a short AI-assisted introduction draft for ${companyName}. It confirms the lead context, mapped products, and the next commercial objective before manual review.\n\nRegards,\nSETU Flow`,
    }
  }
  if (kind === 'follow_up') {
    return {
      subject: `Follow-up for ${companyName}`,
      body: `Hi team,\n\nThis is the follow-up draft for ${companyName}. It confirms the current interest, clarifies open questions, and asks for the next commercial response.\n\nRegards,\nSETU Flow`,
    }
  }
  return {
    subject: `Quote message for ${companyName}`,
    body: `Hi team,\n\nThis is the quote-share message draft for ${companyName}. Please review the pricing context, any key assumptions, and the requested next action before marking it as sent.\n\nRegards,\nSETU Flow`,
  }
}

function formatDateTimeLabel(value?: string | null) {
  const formatted = formatDateTime(value)
  return formatted === '—' ? 'Not scheduled' : formatted
}

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function toQualificationLabel(value: LeadQualificationStatus) {
  return value.replace(/_/g, ' ')
}

function extractQuoteId(href: string) {
  return new URLSearchParams(href.split('?')[1] ?? '').get('quoteId')
}


function inferProductCategory(name: string) {
  const normalized = name.toLowerCase()
  if (normalized.includes('chip')) return 'Chips & snacks'
  if (normalized.includes('powder')) return 'Powders'
  if (normalized.includes('jaggery') || normalized.includes('candy') || normalized.includes('sugar')) return 'Sweeteners'
  if (normalized.includes('onion')) return 'Onion products'
  if (normalized.includes('garlic')) return 'Garlic products'
  return 'Other products'
}

function groupProductsByCategory(products: ProductOption[]) {
  const grouped = new Map<string, ProductOption[]>()
  for (const product of products) {
    const category = product.categoryName?.trim() || inferProductCategory(product.name)
    grouped.set(category, [...(grouped.get(category) ?? []), product])
  }
  return Array.from(grouped.entries())
}

type InlineProductDraft = {
  name: string
  categoryId: string
  pricingType: 'chips' | 'powders'
  skuCode: string
  packLabel: string
  brandName: string
  exFactoryValue: string
  fobValue: string
}

const INITIAL_INLINE_PRODUCT_DRAFT: InlineProductDraft = {
  name: '',
  categoryId: '',
  pricingType: 'chips',
  skuCode: '',
  packLabel: '',
  brandName: 'Roohted',
  exFactoryValue: '',
  fobValue: '',
}

function AddProductModal({
  open,
  categories,
  loadingOptions,
  saving,
  error,
  draft,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean
  categories: ProductCategoryOption[]
  loadingOptions: boolean
  saving: boolean
  error: string | null
  draft: InlineProductDraft
  onClose: () => void
  onChange: <K extends keyof InlineProductDraft>(key: K, value: InlineProductDraft[K]) => void
  onSave: () => void
}) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[22px] border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Add product inside coverage</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">Create a product without leaving this lead</h3>
            <p className="mt-2 text-sm text-slate-500">Add the product, choose its category, and make it selectable in coverage immediately.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600">Close</button>
        </div>

        {error ? <div className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Product name</span>
            <input value={draft.name} onChange={(event) => onChange('name', event.target.value)} placeholder="Organic Banana Chips" className="w-full rounded-[14px] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Category</span>
            <select value={draft.categoryId} onChange={(event) => onChange('categoryId', event.target.value)} disabled={loadingOptions} className="w-full rounded-[14px] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300">
              <option value="">Select category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pricing type</span>
            <select value={draft.pricingType} onChange={(event) => onChange('pricingType', event.target.value as InlineProductDraft['pricingType'])} className="w-full rounded-[14px] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300">
              <option value="chips">Chips / snacks</option>
              <option value="powders">Powders</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">SKU code</span>
            <input value={draft.skuCode} onChange={(event) => onChange('skuCode', event.target.value)} placeholder="SETU-NEW-001" className="w-full rounded-[14px] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pack label</span>
            <input value={draft.packLabel} onChange={(event) => onChange('packLabel', event.target.value)} placeholder={draft.pricingType === 'powders' ? '1 kg' : '60 g'} className="w-full rounded-[14px] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Brand</span>
            <input value={draft.brandName} onChange={(event) => onChange('brandName', event.target.value)} placeholder="Roohted" className="w-full rounded-[14px] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ex-factory</span>
            <input value={draft.exFactoryValue} onChange={(event) => onChange('exFactoryValue', event.target.value)} placeholder={draft.pricingType === 'powders' ? '9.50' : '1.15'} className="w-full rounded-[14px] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300" />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">FOB</span>
            <input value={draft.fobValue} onChange={(event) => onChange('fobValue', event.target.value)} placeholder={draft.pricingType === 'powders' ? '10.90' : '1.35'} className="w-full rounded-[14px] border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-300" />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onSave} disabled={saving} className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Adding product…' : 'Add product to coverage'}</button>
          <p className="text-xs text-slate-500">The new product will appear in this coverage list and be pre-selected.</p>
        </div>
      </div>
    </div>
  )
}


export default function LeadQuickEditDrawer({
  open = false,
  onClose,
  lead,
  availableProducts,
  availableMarkets,
  selectedProductIds,
  selectedMarketIds,
  quoteWorkspaceHref,
  quoteCount,
  latestQuoteNumber,
  pendingFollowUpId,
  nextFollowUpAt,
  openFollowUpCount = 0,
  overdueFollowUpCount = 0,
  dueSoonFollowUpCount = 0,
  qualificationStatus = 'not_started',
  qualificationNotes,
  initialSection = 'details',
  onLeadUpdated,
  onCoverageSaved,
  onProductCreated,
  onWorkflowUpdated,
  onOperationLogged,
  onQuoteReady,
}: Props) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<LeadQuickEditDrawerSection>(initialSection)
  const hasActiveQuote = quoteCount > 0
  const visibleSections = useMemo(() => getSectionLabels(hasActiveQuote), [hasActiveQuote])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detailsSaving, setDetailsSaving] = useState(false)
  const [coverageSaving, setCoverageSaving] = useState(false)
  const [coverageSearch, setCoverageSearch] = useState('')
  const [drawerProducts, setDrawerProducts] = useState<ProductOption[]>(availableProducts)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [addProductSaving, setAddProductSaving] = useState(false)
  const [addProductError, setAddProductError] = useState<string | null>(null)
  const [productCategories, setProductCategories] = useState<ProductCategoryOption[]>([])
  const [productOptionsLoading, setProductOptionsLoading] = useState(false)
  const [newProductDraft, setNewProductDraft] = useState<InlineProductDraft>(INITIAL_INLINE_PRODUCT_DRAFT)
  const [quoteOpening, setQuoteOpening] = useState(false)
  const [approvalSaving, setApprovalSaving] = useState(false)
  const [outreachPendingKind, setOutreachPendingKind] = useState<'introduction' | 'follow_up' | 'quote_message' | null>(null)

  const [name, setName] = useState(lead.name || '')
  const [contactName, setContactName] = useState(lead.contactName || '')
  const [email, setEmail] = useState(lead.email || '')
  const [phone, setPhone] = useState(lead.phone || '')
  const [country, setCountry] = useState(lead.country || '')

  const [productIdSet, setProductIdSet] = useState<string[]>(selectedProductIds)
  const [marketIdSet, setMarketIdSet] = useState<string[]>(selectedMarketIds)

  const [followUpAt, setFollowUpAt] = useState(toDateTimeLocalValue(nextFollowUpAt))
  const [followUpSaving, setFollowUpSaving] = useState(false)
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null)
  const [workflowFollowUpId, setWorkflowFollowUpId] = useState<string | null>(pendingFollowUpId ?? null)
  const [workflowCounts, setWorkflowCounts] = useState({
    open: openFollowUpCount,
    overdue: overdueFollowUpCount,
    dueSoon: dueSoonFollowUpCount,
  })
  const [qualificationValue, setQualificationValue] = useState<LeadQualificationStatus>(qualificationStatus)
  const [qualificationText, setQualificationText] = useState(qualificationNotes ?? '')
  const [qualificationSaving, setQualificationSaving] = useState(false)
  const [qualificationMessage, setQualificationMessage] = useState<string | null>(null)

  const templateCompanyName = useMemo(() => {
    const trimmed = name.trim()
    return trimmed || lead.name
  }, [lead.name, name])
  const introTemplate = useMemo(() => buildTemplate('introduction', templateCompanyName), [templateCompanyName])
  const followUpTemplate = useMemo(() => buildTemplate('follow_up', templateCompanyName), [templateCompanyName])
  const quoteTemplate = useMemo(() => buildTemplate('quote_message', templateCompanyName), [templateCompanyName])
  const [introBody, setIntroBody] = useState(introTemplate.body)
  const [followUpBody, setFollowUpBody] = useState(followUpTemplate.body)
  const [quoteBody, setQuoteBody] = useState(quoteTemplate.body)
  const [approvalNote, setApprovalNote] = useState(`Please review pricing changes for ${lead.name} and confirm the requested quote adjustment before approval.`)

  useEffect(() => {
    if (!open) return
    setActiveSection(initialSection === 'quote' && !hasActiveQuote ? 'workflow' : initialSection)
    setName(lead.name || '')
    setContactName(lead.contactName || '')
    setEmail(lead.email || '')
    setPhone(lead.phone || '')
    setCountry(lead.country || '')
    setDrawerProducts(availableProducts)
    setProductIdSet(selectedProductIds)
    setMarketIdSet(selectedMarketIds)
    setFollowUpAt(toDateTimeLocalValue(nextFollowUpAt))
    setWorkflowFollowUpId(pendingFollowUpId ?? null)
    setWorkflowCounts({
      open: openFollowUpCount,
      overdue: overdueFollowUpCount,
      dueSoon: dueSoonFollowUpCount,
    })
    setQualificationValue(qualificationStatus)
    setQualificationText(qualificationNotes ?? '')
    setIntroBody(buildTemplate('introduction', lead.name || 'this lead').body)
    setFollowUpBody(buildTemplate('follow_up', lead.name || 'this lead').body)
    setQuoteBody(buildTemplate('quote_message', lead.name || 'this lead').body)
    setApprovalNote(`Please review pricing changes for ${lead.name} and confirm the requested quote adjustment before approval.`)
    setFollowUpMessage(null)
    setQualificationMessage(null)
    setMessage(null)
    setError(null)
    setCoverageSearch('')
    setAddProductOpen(false)
    setAddProductSaving(false)
    setAddProductError(null)
    setNewProductDraft(INITIAL_INLINE_PRODUCT_DRAFT)
  }, [
    initialSection,
    lead.contactName,
    lead.country,
    lead.email,
    lead.name,
    lead.phone,
    nextFollowUpAt,
    open,
    openFollowUpCount,
    overdueFollowUpCount,
    dueSoonFollowUpCount,
    pendingFollowUpId,
    qualificationNotes,
    qualificationStatus,
    selectedMarketIds,
    selectedProductIds,
    availableProducts,
    hasActiveQuote,
  ])

  useEffect(() => {
    if (!hasActiveQuote && activeSection === 'quote') {
      setActiveSection('workflow')
    }
  }, [activeSection, hasActiveQuote])

  if (!open) return null

  const resetFeedback = () => {
    setMessage(null)
    setError(null)
  }

  const toggleSelection = (current: string[], id: string, setter: (next: string[]) => void) => {
    const set = new Set(current)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    setter(Array.from(set))
  }

  const filteredProductGroups = groupProductsByCategory(drawerProducts.filter((product) => product.name.toLowerCase().includes(coverageSearch.toLowerCase())))

  const setNewProductField = <K extends keyof InlineProductDraft>(key: K, value: InlineProductDraft[K]) => {
    setNewProductDraft((current) => ({ ...current, [key]: value }))
  }

  const openAddProduct = async () => {
    setAddProductOpen(true)
    setAddProductError(null)
    if (productCategories.length > 0) return
    setProductOptionsLoading(true)
    try {
      const result = await getProductOptions()
      setProductCategories(result.categories)
      setNewProductDraft((current) => ({
        ...current,
        categoryId: current.categoryId || result.categories[0]?.id || '',
      }))
    } catch (loadError) {
      setAddProductError(loadError instanceof Error ? loadError.message : 'Failed to load product categories.')
    } finally {
      setProductOptionsLoading(false)
    }
  }

  const saveInlineProduct = async () => {
    if (!newProductDraft.name.trim() || !newProductDraft.categoryId || !newProductDraft.skuCode.trim() || !newProductDraft.packLabel.trim()) {
      setAddProductError('Product name, category, SKU code, and pack label are required.')
      return
    }

    setAddProductSaving(true)
    setAddProductError(null)
    try {
      const result = await createProduct({
        name: newProductDraft.name.trim(),
        category_id: newProductDraft.categoryId,
        brand_name: newProductDraft.brandName.trim() || null,
        pricing_type: newProductDraft.pricingType,
        variant: {
          sku_code: newProductDraft.skuCode.trim(),
          pack_label: newProductDraft.packLabel.trim(),
          pack_size_unit: 'g',
          pricing_mode_default: newProductDraft.pricingType === 'powders' ? 'kg' : 'unit',
          supports_bulk_pricing: newProductDraft.pricingType === 'powders',
        },
        pricing: {
          ex_factory_value: newProductDraft.exFactoryValue ? Number(newProductDraft.exFactoryValue) : null,
          ex_factory_unit: newProductDraft.pricingType === 'powders' ? 'kg' : 'unit',
          fob_value: newProductDraft.fobValue ? Number(newProductDraft.fobValue) : null,
          fob_unit: newProductDraft.pricingType === 'powders' ? 'kg' : 'unit',
          source_sheet_name: 'LEAD_COVERAGE_DRAWER',
        },
      })

      const categoryName = productCategories.find((category) => category.id === newProductDraft.categoryId)?.name ?? 'Other products'
      const createdProduct: ProductOption = {
        id: result.product_id,
        name: newProductDraft.name.trim(),
        categoryName,
      }

      setDrawerProducts((current) => current.some((item) => item.id === createdProduct.id) ? current : [createdProduct, ...current])
      setProductIdSet((current) => current.includes(createdProduct.id) ? current : [createdProduct.id, ...current])
      onProductCreated?.(createdProduct)
      setCoverageSearch(createdProduct.name)
      setAddProductOpen(false)
      setNewProductDraft((current) => ({
        ...INITIAL_INLINE_PRODUCT_DRAFT,
        categoryId: current.categoryId,
        pricingType: current.pricingType,
      }))
      setMessage(`Added ${createdProduct.name} and selected it in coverage.`)
    } catch (saveError) {
      setAddProductError(saveError instanceof Error ? saveError.message : 'Failed to create product.')
    } finally {
      setAddProductSaving(false)
    }
  }

  const submitDetails = async () => {
    resetFeedback()
    setDetailsSaving(true)
    const formData = new FormData()
    formData.set('lead_id', lead.id)
    formData.set('lead_type', lead.leadType ?? 'buyer')
    formData.set('company_name', name)
    formData.set('contact_name', contactName)
    formData.set('email', email)
    formData.set('phone', phone)
    formData.set('country', country)
    formData.set('owner_user_id', '')
    formData.set('source_label', lead.sourceLabel ?? '')
    const result = await saveLeadDetails(undefined, formData)
    if (result?.error) {
      setError(result.error)
      setDetailsSaving(false)
      return
    }
    setMessage(result?.success ?? 'Lead details saved.')
    onLeadUpdated?.({ name, contactName, email, phone, country })
    setDetailsSaving(false)
    onClose?.()
    router.refresh()
  }

  const submitCoverage = async () => {
    resetFeedback()
    setCoverageSaving(true)
    const formData = new FormData()
    formData.set('lead_id', lead.id)
    formData.set('lead_type', lead.leadType ?? 'buyer')
    formData.set('company_name', name || lead.name)
    formData.set('contact_name', contactName)
    formData.set('email', email)
    formData.set('phone', phone)
    formData.set('country', country)
    formData.set('owner_user_id', '')
    formData.set('source_label', lead.sourceLabel ?? '')
    productIdSet.forEach((id) => formData.append('product_ids', id))
    marketIdSet.forEach((id) => formData.append('market_ids', id))
    const result = await saveLeadCoverage(undefined, formData)
    if (result?.error) {
      setError(result.error)
      setCoverageSaving(false)
      return
    }
    setMessage(result?.success ?? 'Coverage saved.')
    onCoverageSaved?.({ productIds: result?.selectedProductIds ?? productIdSet, marketIds: result?.selectedMarketIds ?? marketIdSet })
    onOperationLogged?.({
      kind: 'coverage_saved',
      label: 'Coverage saved',
      detail: `${(result?.selectedProductIds ?? productIdSet).length} products · ${(result?.selectedMarketIds ?? marketIdSet).length} markets`,
      happenedAt: new Date().toISOString(),
      statusTone: 'blue',
    })
    setCoverageSaving(false)
    onClose?.()
    router.refresh()
  }

  const saveFollowUp = async (value: string) => {
    resetFeedback()
    setFollowUpSaving(true)
    setFollowUpMessage(null)
    const formData = new FormData()
    formData.set('lead_id', lead.id)
    formData.set('scheduled_at', new Date(value).toISOString())
    const result = await scheduleLeadFollowUp(undefined, formData)
    if (result?.error) {
      setError(result.error)
      setFollowUpSaving(false)
      return
    }

    const nextCounts = {
      open: Math.max(workflowCounts.open, 1),
      overdue: new Date(value).getTime() < Date.now() ? 1 : 0,
      dueSoon: new Date(value).getTime() >= Date.now() && new Date(value).getTime() <= Date.now() + 1000 * 60 * 60 * 24 * 2 ? 1 : 0,
    }
    const nextFollowUpId = result?.followUpId ?? workflowFollowUpId ?? `scheduled-${lead.id}`
    setWorkflowCounts(nextCounts)
    setWorkflowFollowUpId(nextFollowUpId)
    setFollowUpMessage(result?.success ?? 'Follow-up scheduled.')
    onWorkflowUpdated?.({
      nextFollowUpAt: new Date(value).toISOString(),
      pendingFollowUpId: nextFollowUpId,
      openFollowUpCount: nextCounts.open,
      overdueFollowUpCount: nextCounts.overdue,
      dueSoonFollowUpCount: nextCounts.dueSoon,
    })
    onOperationLogged?.({
      kind: 'follow_up',
      label: 'Follow-up scheduled',
      detail: `Next follow-up set for ${formatDateTimeLabel(new Date(value).toISOString())}`,
      happenedAt: new Date().toISOString(),
      statusTone: 'blue',
    })
    setFollowUpSaving(false)
    router.refresh()
  }

  const completeLatestFollowUp = async () => {
    if (!workflowFollowUpId) return
    resetFeedback()
    setFollowUpSaving(true)
    const formData = new FormData()
    formData.set('lead_id', lead.id)
    formData.set('follow_up_id', workflowFollowUpId)
    const result = await completeLeadFollowUp(undefined, formData)
    if (result?.error) {
      setError(result.error)
      setFollowUpSaving(false)
      return
    }

    const nextCounts = {
      open: Math.max(0, workflowCounts.open - 1),
      overdue: 0,
      dueSoon: 0,
    }
    setWorkflowFollowUpId(null)
    setWorkflowCounts(nextCounts)
    setFollowUpAt('')
    setFollowUpMessage(result?.success ?? 'Follow-up completed.')
    onWorkflowUpdated?.({
      nextFollowUpAt: null,
      pendingFollowUpId: null,
      openFollowUpCount: nextCounts.open,
      overdueFollowUpCount: nextCounts.overdue,
      dueSoonFollowUpCount: nextCounts.dueSoon,
    })
    onOperationLogged?.({
      kind: 'follow_up',
      label: 'Follow-up completed',
      detail: 'Latest follow-up was cleared from the command center.',
      happenedAt: new Date().toISOString(),
      statusTone: 'emerald',
    })
    setFollowUpSaving(false)
    router.refresh()
  }

  const saveQualification = async (status: LeadQualificationStatus, notes: string) => {
    resetFeedback()
    setQualificationSaving(true)
    setQualificationMessage(null)
    const formData = new FormData()
    formData.set('lead_id', lead.id)
    formData.set('qualification_status', status)
    formData.set('qualification_notes', notes)
    const result = await updateLeadQualification(undefined, formData)
    if (result?.error) {
      setError(result.error)
      setQualificationSaving(false)
      return
    }

    setQualificationMessage(result?.success ?? 'Qualification updated.')
    onWorkflowUpdated?.({
      qualificationStatus: status,
      qualificationNotes: notes,
    })
    onOperationLogged?.({
      kind: 'qualification',
      label: `Qualification set to ${toQualificationLabel(status)}`,
      detail: notes || 'Qualification updated from the command center.',
      happenedAt: new Date().toISOString(),
      statusTone: status === 'qualified' ? 'emerald' : status === 'disqualified' ? 'amber' : 'blue',
    })
    setQualificationSaving(false)
    router.refresh()
  }

  const markSent = async (kind: 'introduction' | 'follow_up' | 'quote_message', subject: string, body: string) => {
    resetFeedback()
    setOutreachPendingKind(kind)
    const result = await recordLeadCommunicationSent({
      leadId: lead.id,
      communicationType: kind,
      subject,
      body,
      quoteId: kind === 'quote_message' && quoteCount > 0 ? extractQuoteId(quoteWorkspaceHref) : null,
    })
    if (result?.error) {
      setError(result.error)
      setOutreachPendingKind(null)
      return
    }
    setMessage(result?.success ?? 'Marked as sent.')
    if (result?.item) onOperationLogged?.(result.item)
    setOutreachPendingKind(null)
    router.refresh()
  }

  const openQuoteWorkspace = async () => {
    resetFeedback()
    setQuoteOpening(true)
    const result = await openOrCreateLeadQuoteDraft(lead.id)
    if (result?.error) {
      setError(result.error)
      setQuoteOpening(false)
      return
    }
    onQuoteReady?.({
      quoteId: result?.quoteId ?? null,
      quoteNumber: result?.quote?.quote_number ?? latestQuoteNumber ?? null,
      quoteCountDelta: quoteCount > 0 ? 0 : 1,
    })
    if (result?.quoteId) {
      onOperationLogged?.({
        kind: 'quote_ready',
        label: result?.quote?.quote_number ? `Quote ready · ${result.quote.quote_number}` : 'Quote workspace opened',
        detail: quoteCount > 0 ? 'Existing draft opened' : 'New quote draft created',
        happenedAt: new Date().toISOString(),
        statusTone: 'blue',
        quoteId: result.quoteId,
        quoteNumber: result?.quote?.quote_number ?? null,
      })
      const targetHref = `/leads/${lead.id}/quote?quoteId=${result.quoteId}`
      setQuoteOpening(false)
      onClose?.()
      navigateToLeadCommandCenter(router, targetHref)
      return
    }
    setQuoteOpening(false)
    setError('Quote workspace was prepared, but no quote id was returned.')
    router.refresh()
  }

  const requestApproval = async () => {
    resetFeedback()
    setApprovalSaving(true)
    const result = await recordLeadQuoteApprovalRequest({
      leadId: lead.id,
      note: approvalNote,
      quoteId: extractQuoteId(quoteWorkspaceHref),
    })
    if (result?.error) {
      setError(result.error)
      setApprovalSaving(false)
      return
    }
    setMessage(result?.success ?? 'Approval request recorded.')
    if (result?.item) onOperationLogged?.(result.item)
    setApprovalSaving(false)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25">
      <div className="relative flex h-full w-full max-w-[560px] flex-col border-l border-slate-200 bg-white shadow-2xl">
        <AddProductModal
          open={addProductOpen}
          categories={productCategories}
          loadingOptions={productOptionsLoading}
          saving={addProductSaving}
          error={addProductError}
          draft={newProductDraft}
          onClose={() => {
            setAddProductOpen(false)
            setAddProductError(null)
          }}
          onChange={setNewProductField}
          onSave={() => void saveInlineProduct()}
        />
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead ops drawer</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">{lead.name}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600">Close</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`rounded-full px-3 py-1.5 text-sm ${activeSection === section.id ? 'bg-slate-950 text-white' : 'border border-slate-200 text-slate-600'}`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {activeSection === 'details' ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">Company name<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="block text-sm font-medium text-slate-700">Primary contact<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={contactName} onChange={(e) => setContactName(e.target.value)} /></label>
              <label className="block text-sm font-medium text-slate-700">Email<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label className="block text-sm font-medium text-slate-700">Phone<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
              <label className="block text-sm font-medium text-slate-700">Country<input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={country} onChange={(e) => setCountry(e.target.value)} /></label>
              <button type="button" onClick={() => void submitDetails()} disabled={detailsSaving} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{detailsSaving ? 'Saving…' : 'Save details'}</button>
            </div>
          ) : null}

          {activeSection === 'coverage' ? (
            <div className="space-y-6">
              <div className="rounded-[20px] border border-brand-200 bg-brand-50/60 px-4 py-4 shadow-[0_8px_20px_rgba(59,130,246,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Coverage manager</p>
                    <p className="mt-1 text-sm text-slate-600">Products are commercially active across markets by default. Keep products accurate first, then add market context where it helps operators understand trade fit.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void openAddProduct()} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-soft hover:bg-brand-50">+ Add product</button>
                    <a href="/products" target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-brand-200 hover:text-brand-700">Open product workspace</a>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Products</p>
                    <p className="mt-1 text-xs text-slate-500">Search, select, and group coverage by product category. Add new products inline when you need a category that is missing from this lead.</p>
                  </div>
                  <input value={coverageSearch} onChange={(e) => setCoverageSearch(e.target.value)} placeholder="Search products..." className="w-full max-w-[220px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-brand-300" />
                </div>
                <div className="mt-4 space-y-4">
                  {filteredProductGroups.map(([category, products]) => (
                    <div key={category} className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{category}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">{products.filter((product) => productIdSet.includes(product.id)).length} selected</span>
                      </div>
                      <div className="grid gap-2">
                        {products.map((product) => (
                          <label key={product.id} className={`flex items-center justify-between gap-3 rounded-[16px] border px-3 py-3 text-sm transition ${productIdSet.includes(product.id) ? 'border-brand-200 bg-white shadow-soft' : 'border-slate-200 bg-white/80 hover:border-slate-300'}`}>
                            <div className="flex items-center gap-3">
                              <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${productIdSet.includes(product.id) ? 'border-brand-500 bg-brand-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
                                ✓
                              </span>
                              <span className="font-medium text-slate-700">{product.name}</span>
                            </div>
                            <input type="checkbox" className="sr-only" checked={productIdSet.includes(product.id)} onChange={() => toggleSelection(productIdSet, product.id, setProductIdSet)} />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Markets</p>
                <p className="mt-1 text-xs text-slate-500">Markets are optional context. Keep them accurate, but they do not block commercial work by default.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {availableMarkets.map((market) => (
                    <label key={market.id} className={`flex items-center gap-3 rounded-[16px] border px-3 py-3 text-sm transition ${marketIdSet.includes(market.id) ? 'border-brand-200 bg-white shadow-soft' : 'border-slate-200 bg-white/80 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={marketIdSet.includes(market.id)} onChange={() => toggleSelection(marketIdSet, market.id, setMarketIdSet)} />
                      <span>{market.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => void submitCoverage()} disabled={coverageSaving} className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{coverageSaving ? 'Saving…' : 'Save coverage'}</button>
                <button type="button" onClick={() => void openAddProduct()} className="text-sm font-medium text-brand-700 hover:underline">Need a product from another category? Add it right here.</button>
              </div>
            </div>
          ) : null}

          {activeSection === 'workflow' ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Commercial handoff</p>
                    <p className="mt-1 text-xs text-slate-500">Use one workflow-first quote entry. Quote-only operations appear after a real quote exists.</p>
                  </div>
                  <button type="button" onClick={() => void openQuoteWorkspace()} disabled={quoteOpening} className={hasActiveQuote ? 'rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60' : 'rounded-full bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60'}>{quoteOpening ? 'Opening…' : hasActiveQuote ? 'Review quote' : 'Create quote'}</button>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-900">{hasActiveQuote ? (latestQuoteNumber ?? 'Active quote in progress') : 'No active quote yet'}</p>
                  <p className="mt-1">{hasActiveQuote ? 'Quote work can now be reviewed without duplicating entry paths.' : 'Stay in workflow until commercial readiness is clear, then create the first quote from here.'}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Follow-up control</p>
                    <p className="mt-1 text-xs text-slate-500">Changes save automatically so operators can keep momentum inside the command center.</p>
                  </div>
                  {workflowFollowUpId ? (
                    <button type="button" onClick={() => void completeLatestFollowUp()} disabled={followUpSaving} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60">Complete latest</button>
                  ) : null}
                </div>
                <input
                  value={followUpAt}
                  onChange={(event) => {
                    const value = event.target.value
                    setFollowUpAt(value)
                    if (value) void saveFollowUp(value)
                  }}
                  type="datetime-local"
                  className="mt-4 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                />
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p>{workflowCounts.open} open · {workflowCounts.overdue} overdue · {workflowCounts.dueSoon} due soon</p>
                  <p className="mt-1">Next follow-up: {followUpAt ? formatDateTimeLabel(new Date(followUpAt).toISOString()) : 'Not scheduled'}</p>
                </div>
                <p className="mt-3 text-sm text-slate-500">{followUpSaving ? 'Saving follow-up…' : followUpMessage || 'Pick a date to auto-save the next action.'}</p>
              </div>


              <div className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Qualification</p>
                    <p className="mt-1 text-xs text-slate-500">Keep qualification current so pipeline and quote readiness stay trustworthy.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">{toQualificationLabel(qualificationValue)}</span>
                </div>
                <select
                  value={qualificationValue}
                  onChange={(event) => {
                    const nextValue = event.target.value as LeadQualificationStatus
                    setQualificationValue(nextValue)
                    void saveQualification(nextValue, qualificationText)
                  }}
                  className="mt-4 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                >
                  {QUALIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  value={qualificationText}
                  onChange={(event) => setQualificationText(event.target.value)}
                  onBlur={() => void saveQualification(qualificationValue, qualificationText)}
                  className="mt-3 w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Capture why this lead is qualified, in review, or disqualified."
                />
                <p className="mt-3 text-sm text-slate-500">{qualificationSaving ? 'Saving qualification…' : qualificationMessage || 'Status changes save immediately. Notes save when you leave the field.'}</p>
              </div>
            </div>
          ) : null}

          {activeSection === 'outreach' ? (
            <div className="space-y-6">
              {[
                { key: 'intro', label: 'Introduction', subject: introTemplate.subject, body: introBody, setBody: setIntroBody, type: 'introduction' as const },
                { key: 'follow-up', label: 'Follow-up', subject: followUpTemplate.subject, body: followUpBody, setBody: setFollowUpBody, type: 'follow_up' as const },
                ...(hasActiveQuote ? [{ key: 'quote', label: 'Quote message', subject: quoteTemplate.subject, body: quoteBody, setBody: setQuoteBody, type: 'quote_message' as const }] : []),
              ].map((item) => (
                <div key={item.key} className="rounded-3xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{item.subject}</p>
                  <textarea className="mt-3 min-h-[120px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" value={item.body} onChange={(e) => item.setBody(e.target.value)} />
                  <button type="button" onClick={() => void markSent(item.type, item.subject, item.body)} disabled={outreachPendingKind !== null} className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{outreachPendingKind === item.type ? 'Recording…' : 'Mark sent'}</button>
                </div>
              ))}
            </div>
          ) : null}

          {activeSection === 'quote' && hasActiveQuote ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Quote workspace</p>
                <p className="mt-2 text-sm text-slate-600">Latest quote: {latestQuoteNumber ?? 'draft available'}</p>
                <button type="button" onClick={() => void openQuoteWorkspace()} disabled={quoteOpening} className="mt-3 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{quoteOpening ? 'Opening…' : 'Review quote'}</button>
              </div>

              <div className="rounded-3xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-900">Approval request</p>
                <p className="mt-1 text-xs text-slate-500">Approval requests are recorded internally and appear on the lead timeline for reviewer follow-up.</p>
                <textarea className="mt-3 min-h-[120px] w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm" value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} />
                <button type="button" onClick={() => void requestApproval()} disabled={approvalSaving} className="mt-3 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{approvalSaving ? 'Recording…' : 'Record approval request'}</button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-5 text-sm text-rose-600">{error}</p> : null}
          {message ? <p className="mt-5 text-sm text-emerald-600">{message}</p> : null}
        </div>
      </div>
    </div>
  )
}
