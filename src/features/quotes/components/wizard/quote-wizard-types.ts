import type { QuotePricingBasis } from "@/lib/pricing-basis-contract";

export type ProductOption = {
  id: string;
  name: string;
  defaultVariantId: string | null;
  defaultVariantName: string | null;
  catalogPriceId: string | null;
  catalogPriceAmount: number | null;
  catalogPriceCurrency: string | null;
  catalogMarketId: string | null;
  exFactoryPriceAmount?: number | null;
  fobPriceAmount?: number | null;
  cifBasePriceAmount?: number | null;
  bulkPriceAmount?: number | null;
  freightAddOnUsd?: number | null;
  pricingModeDefault?: string | null;
  pricingType?: string | null;
  unitsPerCase?: number | null;
  skuCode?: string | null;
  packLabel?: string | null;
  moqValue?: number | null;
  moqUnit?: string | null;
  moqDisplay?: string | null;
};
export type PricingBasis = QuotePricingBasis;
export type RfqOption = {
  id: string;
  status: string;
  currency: string | null;
  notes?: string | null;
};
export type QuoteRecord = {
  id: string;
  lead_id: string;
  rfq_id: string | null;
  status: string;
  currency: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;
  current_version_id?: string | null;
  lineItems?: Array<{
    id: string;
    product_id: string | null;
    product_variant_id: string | null;
    catalog_price_id: string | null;
    catalog_price_amount: number | null;
    catalog_price_currency: string | null;
    quantity: number;
    unit_price: number | null;
    currency: string | null;
    is_price_overridden?: boolean | null;
    override_reason?: string | null;
    source_ex_factory_usd?: number | null;
    source_fob_usd?: number | null;
    source_bulk_usd_per_kg?: number | null;
    freight_add_on_usd?: number | null;
    notes: string | null;
  }>;
};

export type QuoteVersionRecord = {
  id: string;
  quote_id: string | null;
  version_no: number | null;
  status: string | null;
  created_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  pdf_document_id: string | null;
};
export type DraftQuoteLine = {
  product_id: string;
  product_variant_id: string;
  catalog_price_id: string;
  catalog_price_amount: number | null;
  catalog_price_currency: string;
  quantity: number;
  unit_price: number;
  currency: string;
  source_ex_factory_usd?: number | null;
  source_fob_usd?: number | null;
  source_bulk_usd_per_kg?: number | null;
  freight_add_on_usd?: number | null;
  override_reason: string;
  notes: string;
};
export type StepId = "product" | "pricing" | "terms" | "review" | "send";
export type ProgressionGuardSummary = {
  blockerCount: number;
  blockerReasons: string[];
};
export type QuoteRiskTone = "good" | "warning" | "danger";
export type QuoteRiskFlag = {
  id: string;
  label: string;
  detail: string;
  tone: QuoteRiskTone;
};
export type PricingLineIssue = {
  id:
    | "missing-product"
    | "missing-quantity"
    | "missing-catalog-baseline"
    | "missing-source-price"
    | "below-moq"
    | "missing-override-reason";
  label: string;
  detail: string;
  tone: QuoteRiskTone;
};
export type StepFieldId =
  | "rfq_id"
  | "template_id"
  | "pricing_basis"
  | "currency"
  | "line_items"
  | "workflow_status"
  | "approval_state"
  | "approval_required"
  | "notes"
  | "send_checkpoint";
export type RecommendationKey =
  | "currency-invalid"
  | "pricing-empty"
  | "pricing-line-issue"
  | "status-invalid"
  | "approval-pending"
  | "approval-invalid"
  | "send-blockers";
export type RemediationSourceStep = Extract<StepId, "review" | "send">;
export type StepRecommendation = {
  stepId: StepId;
  label: string;
  detail: string;
  tone: QuoteRiskTone;
  recommendationKey: RecommendationKey;
  targetLabel?: string;
  fieldId?: StepFieldId;
  lineIndex?: number;
  issueId?: PricingLineIssue["id"];
};
export type RemediationTarget = {
  stepId: StepId;
  detail: string;
  targetLabel: string;
  recommendationKey: RecommendationKey;
  fieldId?: StepFieldId;
  lineIndex?: number;
  issueId?: PricingLineIssue["id"];
  sourceStepId?: RemediationSourceStep;
};
export type CheckpointDecisionState = "blocked" | "caution" | "ready";
export type CheckpointDecision = {
  state: CheckpointDecisionState;
  tone: QuoteRiskTone;
  title: string;
  detail: string;
  badgeLabel: string;
  actionLabel: string;
  actionNote: string;
  primaryRecommendation: StepRecommendation | null;
  blockerRecommendations: StepRecommendation[];
  warningRecommendations: StepRecommendation[];
};

const QUOTE_EDIT_STEPS: WizardStepDefinition[] = [
  {
    id: "product",
    title: "Workflow context",
    shortLabel: "Context",
    description:
      "Adjust workflow context without changing routing or page architecture.",
  },
  {
    id: "pricing",
    title: "Pricing summary",
    shortLabel: "Pricing",
    description: "Review commercial totals and linked line items in one place.",
  },
  {
    id: "terms",
    title: "Terms and posture",
    shortLabel: "Terms",
    description: "Confirm approval state, workflow posture, and notes.",
  },
  {
    id: "review",
    title: "Review and save",
    shortLabel: "Review",
    description: "Confirm the final draft before saving the quote.",
  },
  {
    id: "send",
    title: "Send checkpoint",
    shortLabel: "Send",
    description:
      "Keep send blockers and approval posture explicit before the quote leaves the team.",
  },
];
