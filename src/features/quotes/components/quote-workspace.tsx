"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { GenerateQuoteCoverNoteButton } from "@/features/ai/components/ai-draft-controls";
import RightDrawer from "@/components/RightDrawer";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StateMessage } from "@/components/ui/state-message";
import {
  saveWorkspaceDefaultView,
  saveWorkspaceView,
} from "@/features/views/server/actions";
import {
  QuoteCreateWizardForm,
  QuoteEditWizardForm,
} from "@/features/quotes/components/quote-wizard-form";
import { QuoteTrustContractPreview } from "@/features/quotes/components/quote-trust-contract-preview";
import {
  logQuoteNegotiationResponse,
  updateQuoteWorkflow,
} from "@/features/quotes/server/actions";
import {
  APPROVAL_STATES,
  getApprovalBadgeClasses,
} from "@/lib/approvalRouting";
import { getPricingTemplate } from "@/lib/pricingTemplates";
import {
  QUOTE_STATUSES,
  computeQuoteTotals,
  getQuoteStatusBadgeClasses,
  getQuoteWorkflowStatus,
  isQuoteLocked,
  getQuoteLockReason,
  parseQuoteWorkflow,
} from "@/lib/quoteWorkflow";
import type { SavedViewDefinition } from "@/lib/savedViews";
import { formatDateTime } from "@/lib/utils";
import { getQuoteTrustContract } from "@/lib/quoteTrust";
import {
  getPricingReadinessClasses,
  getPricingReadinessLabel,
  type CatalogPricingSnapshot,
} from "@/lib/catalog-pricing-model";

type ProductOption = {
  id: string;
  name: string;
  defaultVariantId: string | null;
  defaultVariantName: string | null;
  catalogPriceId: string | null;
  catalogPriceAmount: number | null;
  catalogPriceCurrency: string | null;
  catalogMarketId: string | null;
};
type RfqOption = {
  id: string;
  status: string;
  currency: string | null;
  notes?: string | null;
};
type QuoteRecord = {
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
    notes: string | null;
  }>;
};

type NegotiationEvent = {
  id: string;
  quote_id: string;
  event_type: string | null;
  message: string | null;
  created_at: string | null;
  actor_name: string | null;
  actor_type: string | null;
};
type QuoteCommunication = {
  id: string;
  quote_id: string | null;
  related_entity: string;
  related_id: string | null;
  subject: string | null;
  summary: string | null;
  status: string;
  created_at: string;
  draft_source: string;
  metadata?: unknown;
};
type QuoteVersionRecord = {
  id: string;
  quote_id: string | null;
  version_no: number | null;
  status: string | null;
  created_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  pdf_document_id: string | null;
};
type QuoteSavedViewId =
  | "all"
  | "pending_approval"
  | "customer_active"
  | "finished"
  | string;
type QuoteSortMode = "updated" | "created" | "value";
type ProgressionGuardSummary = {
  blockerCount: number;
  blockerReasons: string[];
};
type WorkflowStatus = ReturnType<typeof getQuoteWorkflowStatus>;
type WorkflowNotice = {
  tone: "success" | "danger";
  title: string;
  description: string;
};

type QuoteStepState = "done" | "current" | "upcoming" | "skipped";
type BuilderStepId = "product" | "pricing" | "terms" | "review" | "send";
type NegotiationComposerMode =
  | "counter_offer"
  | "revision_requested"
  | "customer_reply"
  | "revision_ready"
  | "accepted"
  | "rejected"
  | "send";

type BuilderFocusStep = {
  id: BuilderStepId;
  label: string;
  state: QuoteStepState;
  detail: string;
};

type BuilderGuidance = {
  steps: BuilderFocusStep[];
  title: string;
  description: string;
  validationPrompts: string[];
  recommendations: string[];
  basisLabel: string;
  templateLabel: string;
};

type QuoteQuickAction = {
  label: string;
  description: string;
  disabled?: boolean;
  run?: {
    status: string;
    approvalRequired?: boolean;
    approvalState?: string;
    plainNotes?: string;
  };
};

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm text-slate-600">
      <span className="mb-2 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function getProductCatalogFallback(
  item: NonNullable<QuoteRecord["lineItems"]>[number],
  products: ProductOption[],
) {
  return (
    products.find((product) => product.id === item.product_id) ??
    products.find(
      (product) => product.defaultVariantId === item.product_variant_id,
    ) ??
    null
  );
}

function formatQuoteMoney(
  value: number | null | undefined,
  currency: string | null | undefined,
) {
  if (typeof value !== "number") return "—";
  const normalizedCurrency = (currency ?? "").trim().toUpperCase() || "USD";
  return `${normalizedCurrency} ${value.toFixed(2)}`;
}

function getQuoteApprovalStateValue(quote: QuoteRecord) {
  const parsed = parseQuoteWorkflow(quote.notes);
  const approvalState =
    parsed.meta.approval?.state ??
    (parsed.meta.approval?.required ? "pending" : "not_required");
  return {
    parsed,
    approvalState,
    approvalRequired: Boolean(parsed.meta.approval?.required),
    status: getQuoteWorkflowStatus(quote, parsed.meta.approval),
  };
}

function getQuoteAttentionRank(quote: QuoteRecord) {
  const { approvalState, approvalRequired, status } =
    getQuoteApprovalStateValue(quote);
  if (status === "pending_approval" || approvalState === "pending") return 0;
  if (status === "approved") return 1;
  if (
    !approvalRequired &&
    ["draft", "internal_review", "revised"].includes(status)
  )
    return 2;
  if (
    status === "draft" ||
    status === "internal_review" ||
    status === "revised"
  )
    return 3;
  if (status === "sent") return 4;
  if (status === "accepted") return 5;
  if (status === "rejected" || status === "expired") return 6;
  return 7;
}

function buildQuickWorkflowFormData(
  quote: QuoteRecord,
  overrides: {
    status?: string;
    approvalRequired?: boolean;
    approvalState?: string;
    plainNotes?: string;
  },
) {
  const {
    parsed,
    approvalState: currentApprovalState,
    approvalRequired: currentApprovalRequired,
    status: currentStatus,
  } = getQuoteApprovalStateValue(quote);
  const formData = new FormData();
  formData.set("quote_id", quote.id);
  formData.set(
    "currency",
    String(quote.currency ?? "USD")
      .trim()
      .toUpperCase() || "USD",
  );
  formData.set("template_id", String(parsed.meta.templateId ?? ""));
  formData.set(
    "approval_required",
    (overrides.approvalRequired ?? currentApprovalRequired) ? "true" : "false",
  );
  formData.set(
    "approval_state",
    String(overrides.approvalState ?? currentApprovalState),
  );
  formData.set("status", String(overrides.status ?? currentStatus));
  formData.set(
    "notes",
    String(overrides.plainNotes ?? parsed.plainNotes ?? ""),
  );
  formData.set("pricing_basis", String(parsed.meta.pricingBasis ?? "fob"));
  formData.set(
    "line_items",
    JSON.stringify(
      (quote.lineItems ?? []).map((item) => ({
        product_id: item.product_id ?? "",
        product_variant_id: item.product_variant_id ?? "",
        catalog_price_amount: item.catalog_price_amount ?? "",
        catalog_price_currency:
          item.catalog_price_currency ??
          item.currency ??
          quote.currency ??
          "USD",
        quantity: item.quantity,
        unit_price: item.unit_price ?? item.catalog_price_amount ?? "",
        currency: item.currency ?? quote.currency ?? "USD",
        is_price_overridden: Boolean(item.is_price_overridden),
        override_reason: item.override_reason ?? "",
        notes: item.notes ?? "",
      })),
    ),
  );
  return formData;
}

function getStepClasses(state: QuoteStepState) {
  if (state === "done")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (state === "current") return "border-brand-200 bg-brand-50 text-brand-800";
  if (state === "skipped") return "border-slate-200 bg-slate-50 text-slate-400";
  return "border-slate-200 bg-white text-slate-600";
}

function getFocusQuoteBuilderGuidance(
  quote: QuoteRecord,
  quoteSendGuard?: ProgressionGuardSummary,
): BuilderGuidance {
  const { parsed, status, approvalRequired, approvalState } =
    getQuoteApprovalStateValue(quote);
  const lineItems = quote.lineItems ?? [];
  const plainNotes = String(parsed.plainNotes ?? "").trim();
  const pricingBasis = String(parsed.meta.pricingBasis ?? "fob")
    .trim()
    .toLowerCase();
  const pricingTemplate = getPricingTemplate(
    String(parsed.meta.templateId ?? ""),
  );
  const basisLabel =
    pricingBasis === "ex_factory"
      ? "Ex-Factory"
      : pricingBasis === "cif"
        ? "CIF"
        : "FOB";
  const templateLabel = pricingTemplate?.name ?? "Manual pricing";
  const quoteIsFinalized = [
    "sent",
    "accepted",
    "rejected",
    "expired",
    "revised",
  ].includes(status);
  const productReady = lineItems.some((item) =>
    Boolean(item.product_id || item.product_variant_id),
  );
  const pricingReady =
    lineItems.length > 0 &&
    lineItems.every(
      (item) =>
        item.quantity > 0 &&
        typeof item.unit_price === "number" &&
        !Number.isNaN(item.unit_price),
    );
  const termsReady = Boolean(
    parsed.meta.pricingBasis ||
    parsed.meta.templateId ||
    approvalRequired ||
    plainNotes.length ||
    quote.currency,
  );
  const reviewReady = productReady && pricingReady && termsReady;
  const approvalGateClear = !approvalRequired || approvalState === "approved";
  const sendGuardClear = !quoteSendGuard?.blockerCount;
  const sendReady = reviewReady && approvalGateClear && sendGuardClear;

  let currentStep: BuilderStepId = "send";
  if (!productReady) currentStep = "product";
  else if (!pricingReady) currentStep = "pricing";
  else if (!termsReady) currentStep = "terms";
  else if (!quoteIsFinalized && !sendReady) currentStep = "review";

  const stepState = (
    stepId: BuilderStepId,
    isReady: boolean,
  ): QuoteStepState => {
    if (quoteIsFinalized) return "done";
    if (isReady) return "done";
    if (currentStep === stepId) return "current";
    return "upcoming";
  };

  const steps: BuilderFocusStep[] = [
    {
      id: "product",
      label: "Product",
      state: stepState("product", productReady),
      detail: productReady
        ? `${lineItems.length} commercial line${lineItems.length === 1 ? "" : "s"} linked`
        : "Add at least one product line to anchor the draft.",
    },
    {
      id: "pricing",
      label: "Pricing",
      state: stepState("pricing", pricingReady),
      detail: pricingReady
        ? `Basis ${basisLabel} · ${templateLabel}`
        : "Complete quantity and unit price on every line before review.",
    },
    {
      id: "terms",
      label: "Terms",
      state: stepState("terms", termsReady),
      detail: approvalRequired
        ? `Approval ${approvalState.replaceAll("_", " ")}`
        : "No approval requirement recorded",
    },
    {
      id: "review",
      label: "Review",
      state: quoteIsFinalized
        ? "done"
        : currentStep === "review" || (!sendReady && reviewReady)
          ? "current"
          : reviewReady
            ? "done"
            : "upcoming",
      detail: reviewReady
        ? "Commercial structure is ready for a final operator pass."
        : "Bring product, pricing, and terms into one clean draft first.",
    },
    {
      id: "send",
      label: "Send",
      state: quoteIsFinalized ? "done" : sendReady ? "current" : "upcoming",
      detail: quoteIsFinalized
        ? `Workflow reached ${status.replaceAll("_", " ")}`
        : sendReady
          ? "Ready for customer send from the fast lane."
          : "Approval and guard checks still gate send.",
    },
  ];

  const validationPrompts: string[] = [];
  if (!productReady)
    validationPrompts.push(
      "Add at least one product-linked line so the quote is anchored to real commercial scope.",
    );
  if (!pricingReady)
    validationPrompts.push(
      "Complete quantity and unit price on every line before treating the draft as review-ready.",
    );
  if (!termsReady)
    validationPrompts.push(
      "Set pricing basis, workflow notes, or approval posture so the terms step is explicit.",
    );
  if (approvalRequired && approvalState === "pending")
    validationPrompts.push(
      "Approval is still pending, so send must remain blocked until the reviewer clears it.",
    );
  if ((quoteSendGuard?.blockerCount ?? 0) > 0)
    validationPrompts.push(
      ...(quoteSendGuard?.blockerReasons.slice(0, 2) ?? []),
    );
  if (!validationPrompts.length)
    validationPrompts.push(
      "No builder validation gaps are flagged right now. The draft can stay in the fast lane.",
    );

  const recommendations: string[] = [];
  if (!productReady)
    recommendations.push(
      "Return to the full editor only to add the missing product context, then come back to the fast lane.",
    );
  if (productReady && !pricingReady)
    recommendations.push(
      "Finish pricing on every existing line before changing approval or send posture.",
    );
  if (pricingReady && !termsReady)
    recommendations.push(
      "Record terms and approval posture now so review reads like one commercial story.",
    );
  if (reviewReady && approvalRequired && approvalState === "pending")
    recommendations.push(
      "Use Request approval or Approve now here before treating send as the next move.",
    );
  if (reviewReady && approvalGateClear && !sendGuardClear)
    recommendations.push(
      "Clear the current send blockers first so the send checkpoint stays truthful.",
    );
  if (sendReady)
    recommendations.push(
      "The draft is ready for operator review and customer send without reopening the builder structure.",
    );
  if (!recommendations.length)
    recommendations.push(
      "Keep the quote in focus, make one commercial move, and avoid bouncing across multiple quotes.",
    );

  let title = "Builder posture is in progress";
  let description =
    "Use the guided Product → Pricing → Terms → Review → Send structure to close the next gap without opening trust-layer work early.";
  if (!productReady) {
    title = "Product context is the next missing step";
    description =
      "This quote still needs product-linked scope before the rest of the builder flow becomes reliable.";
  } else if (!pricingReady) {
    title = "Pricing completion is the next missing step";
    description =
      "Keep pricing explicit on every line so the review step stays honest and customer-ready.";
  } else if (!termsReady) {
    title = "Terms posture still needs to be made explicit";
    description =
      "Set approval posture, basis, or operator notes so the draft can be reviewed as one coherent commercial package.";
  } else if (approvalRequired && approvalState === "pending") {
    title = "Review is complete, but approval still gates send";
    description =
      "The builder structure is in place. The safe next move is to clear approval before the quote leaves the team.";
  } else if (!sendGuardClear) {
    title = "Send remains blocked by live guard checks";
    description =
      "The draft is structurally ready, but the explicit send checkpoint still shows active blockers that must be cleared first.";
  } else if (quoteIsFinalized) {
    title = "Builder flow already moved past send";
    description = `This quote has already reached ${status.replaceAll("_", " ")}, so the guided builder sequence is complete for the current version.`;
  } else if (sendReady) {
    title = "Builder flow is ready for send";
    description =
      "Product, pricing, terms, and review are aligned, and the current draft can stay in the fast lane through send.";
  }

  return {
    steps,
    title,
    description,
    validationPrompts: validationPrompts.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
    basisLabel,
    templateLabel,
  };
}

function getApprovalAction(quote: QuoteRecord): QuoteQuickAction | null {
  const { approvalRequired, approvalState, status } =
    getQuoteApprovalStateValue(quote);
  if (["sent", "accepted", "rejected", "expired"].includes(status)) {
    return {
      label: approvalRequired ? "Approval closed" : "No approval needed",
      description:
        "Use the full editor only if you need to reopen approval on a finished quote.",
      disabled: true,
    };
  }
  if (approvalRequired && approvalState === "pending") {
    return {
      label: "Approve now",
      description:
        "Move this quote out of approval so the rep can send it immediately.",
      run: {
        status: "approved",
        approvalRequired: true,
        approvalState: "approved",
        plainNotes: "Quote approved from the quote fast lane.",
      },
    };
  }
  if (approvalRequired && approvalState === "approved") {
    return {
      label: "Approval done",
      description:
        "Approval is already complete. The next obvious step is customer send.",
      disabled: true,
    };
  }
  return {
    label: "Request approval",
    description:
      "Move this quote into an explicit approval state without opening the full editor.",
    run: {
      status: "pending_approval",
      approvalRequired: true,
      approvalState: "pending",
      plainNotes: "Quote submitted for approval from the quote fast lane.",
    },
  };
}

function getOutcomeAction(
  quote: QuoteRecord,
  outcome: "accepted" | "rejected",
): QuoteQuickAction {
  const { approvalRequired, approvalState, status } =
    getQuoteApprovalStateValue(quote);
  if (status === outcome) {
    return {
      label: outcome === "accepted" ? "Already accepted" : "Already rejected",
      description:
        outcome === "accepted"
          ? "This quote is already won and handed toward contract flow."
          : "This quote is already recorded as lost.",
      disabled: true,
    };
  }
  if (["expired"].includes(status)) {
    return {
      label: "Outcome locked",
      description:
        "Expired quotes should be revised before recording a fresh customer outcome.",
      disabled: true,
    };
  }
  return {
    label: outcome === "accepted" ? "Mark accepted" : "Mark rejected",
    description:
      outcome === "accepted"
        ? "Record the customer win and move the commercial flow toward contracts."
        : "Log a lost or declined quote without digging through the full editor.",
    run: {
      status: outcome,
      approvalRequired,
      approvalState,
      plainNotes:
        outcome === "accepted"
          ? "Quote accepted from the quote fast lane."
          : "Quote rejected from the quote fast lane.",
    },
  };
}

function getNegotiationComposerCopy(mode: NegotiationComposerMode) {
  switch (mode) {
    case "counter_offer":
      return {
        title: "Log counter-offer",
        description:
          "Capture the customer counter-offer in the fast lane so the next revision decision is visible immediately.",
        cta: "Save counter-offer",
      };
    case "revision_requested":
      return {
        title: "Log revision request",
        description:
          "Capture that the customer asked for changes before the quote is revised.",
        cta: "Save revision request",
      };
    case "customer_reply":
      return {
        title: "Log customer response",
        description:
          "Record a reply or negotiation note without changing the quote status yet.",
        cta: "Save customer response",
      };
    case "revision_ready":
      return {
        title: "Mark revision ready",
        description:
          "Record that the revised quote is ready for the next customer pass.",
        cta: "Mark revision ready",
      };
    case "accepted":
      return {
        title: "Confirm accepted outcome",
        description:
          "Record the accepted outcome with a short operator note so contract handoff stays obvious.",
        cta: "Confirm accepted",
      };
    case "rejected":
      return {
        title: "Confirm rejected outcome",
        description:
          "Capture the lost reason or commercial note before closing the quote as rejected.",
        cta: "Confirm rejected",
      };
    default:
      return {
        title: "Confirm send",
        description:
          "Add a short operator note before sending so the activity trail reads like a customer-ready handoff.",
        cta: "Confirm send",
      };
  }
}

function getSendAction(
  quote: QuoteRecord,
  guard?: ProgressionGuardSummary,
): QuoteQuickAction {
  const { approvalRequired, approvalState, status } =
    getQuoteApprovalStateValue(quote);
  if (status === "sent") {
    return {
      label: "Already sent",
      description:
        "Use the full editor to move this quote into negotiation, accepted, or rejected.",
      disabled: true,
    };
  }
  if (["accepted", "rejected", "expired"].includes(status)) {
    return {
      label: "Send closed",
      description: "This quote already has a terminal outcome.",
      disabled: true,
    };
  }
  if (guard?.blockerCount) {
    return {
      label: "Resolve blockers to send",
      description:
        guard.blockerReasons[0] ??
        "Quote send is blocked until compliance and document checks clear.",
      disabled: true,
    };
  }
  if (approvalRequired && approvalState !== "approved") {
    return {
      label: "Approval required before send",
      description:
        "Finish quote approval first so sales can send without guessing the next step.",
      disabled: true,
    };
  }
  return {
    label: "Send quote",
    description:
      "Mark the quote as sent from this workspace when the review and approval checks are done.",
    run: {
      status: "sent",
      approvalRequired,
      approvalState,
      plainNotes: "Quote marked sent from the quote fast lane.",
    },
  };
}

export function QuoteWorkspace({
  leadId,
  rfqs,
  quotes,
  products,
  savedViews = [],
  initialSavedView = "all",
  redirectPath,
  pricingSnapshot,
  quoteSendGuard,
  negotiationEvents = [],
  quoteVersions = [],
  communications = [],
  leadCommandHref = `/leads/${leadId}?tab=quotes`,
  rfqWorkspaceHref = `/leads/${leadId}/rfq/new`,
  initialQuoteId = null,
  canManageQuotes = true,
  canSendQuotes = true,
  readOnlyMessage = null,
  sendReadOnlyMessage = null,
}: {
  leadId: string;
  rfqs: RfqOption[];
  quotes: QuoteRecord[];
  products: ProductOption[];
  savedViews?: SavedViewDefinition[];
  initialSavedView?: string;
  redirectPath?: string;
  pricingSnapshot: CatalogPricingSnapshot;
  quoteSendGuard?: ProgressionGuardSummary;
  negotiationEvents?: NegotiationEvent[];
  quoteVersions?: QuoteVersionRecord[];
  communications?: QuoteCommunication[];
  leadCommandHref?: string;
  rfqWorkspaceHref?: string;
  initialQuoteId?: string | null;
  canManageQuotes?: boolean;
  canSendQuotes?: boolean;
  readOnlyMessage?: string | null;
  sendReadOnlyMessage?: string | null;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [quoteRecords, setQuoteRecords] = useState<QuoteRecord[]>(quotes);
  const [activeQuote, setActiveQuote] = useState<QuoteRecord | null>(null);
  const [activeQuoteStep, setActiveQuoteStep] = useState<BuilderStepId | null>(
    null,
  );
  const [focusQuoteId, setFocusQuoteId] = useState<string | null>(
    initialQuoteId ?? quotes[0]?.id ?? null,
  );
  const [savedView, setSavedView] = useState<QuoteSavedViewId>(
    initialSavedView || "all",
  );
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortMode, setSortMode] = useState<QuoteSortMode>("updated");
  const [viewName, setViewName] = useState("");
  const [preferenceFlash, setPreferenceFlash] = useState("");
  const [workflowNotice, setWorkflowNotice] = useState<WorkflowNotice | null>(
    null,
  );
  const [quickActionQuoteId, setQuickActionQuoteId] = useState<string | null>(
    null,
  );
  const [composer, setComposer] = useState<{
    quoteId: string;
    mode: NegotiationComposerMode;
  } | null>(null);
  const [composerNote, setComposerNote] = useState("");
  const [isViewPending, startViewTransition] = useTransition();
  const [isWorkflowPending, startWorkflowTransition] = useTransition();

  useEffect(() => {
    setQuoteRecords(quotes);
  }, [quotes]);

  useEffect(() => {
    if (initialQuoteId && quotes.some((quote) => quote.id === initialQuoteId)) {
      setFocusQuoteId(initialQuoteId);
    }
  }, [initialQuoteId, quotes]);

  useEffect(() => {
    if (activeQuote) {
      const refreshed = quoteRecords.find(
        (quote) => quote.id === activeQuote.id,
      );
      if (refreshed) setActiveQuote(refreshed);
    }
  }, [activeQuote?.id, quoteRecords]);

  useEffect(() => {
    const matched = savedViews.find((view) => view.id === savedView);
    if (matched) {
      const nextStatus =
        typeof matched.filterModel?.statusFilter === "string"
          ? matched.filterModel.statusFilter
          : "";
      const nextSort =
        typeof matched.sortModel?.sortMode === "string"
          ? (matched.sortModel.sortMode as QuoteSortMode)
          : "updated";
      setStatusFilter(nextStatus);
      setSortMode(nextSort);
      return;
    }

    switch (savedView) {
      case "pending_approval":
        setStatusFilter("pending_approval");
        setSortMode("updated");
        break;
      case "customer_active":
        setStatusFilter("customer_active");
        setSortMode("updated");
        break;
      case "finished":
        setStatusFilter("finished");
        setSortMode("value");
        break;
      default:
        setStatusFilter("");
        setSortMode("updated");
    }
  }, [savedView, savedViews]);

  const filteredQuotes = useMemo(() => {
    const matches = quoteRecords.filter((quote) => {
      const parsed = parseQuoteWorkflow(quote.notes);
      const status = getQuoteWorkflowStatus(quote, parsed.meta.approval);
      if (!statusFilter || statusFilter === "all") return true;
      if (statusFilter === "pending_approval")
        return ["pending_approval", "internal_review"].includes(status);
      if (statusFilter === "customer_active")
        return ["approved", "sent", "revised"].includes(status);
      if (statusFilter === "finished")
        return ["accepted", "rejected", "expired"].includes(status);
      return status === statusFilter;
    });

    return [...matches].sort((left, right) => {
      if (sortMode === "created")
        return right.created_at.localeCompare(left.created_at);
      if (sortMode === "value") {
        const leftTotal = computeQuoteTotals(
          left.lineItems ?? [],
          left.currency,
        ).subtotal;
        const rightTotal = computeQuoteTotals(
          right.lineItems ?? [],
          right.currency,
        ).subtotal;
        return rightTotal - leftTotal;
      }
      return right.updated_at.localeCompare(left.updated_at);
    });
  }, [quoteRecords, statusFilter, sortMode]);

  const focusableQuotes = useMemo(
    () =>
      [...filteredQuotes].sort(
        (left, right) =>
          getQuoteAttentionRank(left) - getQuoteAttentionRank(right) ||
          right.updated_at.localeCompare(left.updated_at),
      ),
    [filteredQuotes],
  );

  useEffect(() => {
    if (!filteredQuotes.length) {
      setFocusQuoteId(null);
      return;
    }
    if (
      !focusQuoteId ||
      !filteredQuotes.some((quote) => quote.id === focusQuoteId)
    ) {
      setFocusQuoteId(focusableQuotes[0]?.id ?? filteredQuotes[0]?.id ?? null);
    }
  }, [filteredQuotes, focusQuoteId, focusableQuotes]);

  const focusQuote = useMemo(
    () =>
      filteredQuotes.find((quote) => quote.id === focusQuoteId) ??
      focusableQuotes[0] ??
      filteredQuotes[0] ??
      null,
    [filteredQuotes, focusQuoteId, focusableQuotes],
  );

  const viewButtons: Array<{ id: QuoteSavedViewId; label: string }> = [
    { id: "all", label: "All quotes" },
    { id: "pending_approval", label: "Pending approval" },
    { id: "customer_active", label: "Customer active" },
    { id: "finished", label: "Finished" },
    ...savedViews.map((view) => ({ id: view.id, label: view.name })),
  ];

  const currentFilterModel = { statusFilter };
  const currentSortModel = { sortMode };
  const pendingApprovalCount = useMemo(
    () =>
      quoteRecords.filter((quote) => {
        const parsed = parseQuoteWorkflow(quote.notes);
        return ["pending_approval", "internal_review"].includes(
          getQuoteWorkflowStatus(quote, parsed.meta.approval),
        );
      }).length,
    [quoteRecords],
  );
  const customerActiveCount = useMemo(
    () =>
      quoteRecords.filter((quote) => {
        const parsed = parseQuoteWorkflow(quote.notes);
        return ["approved", "sent", "revised"].includes(
          getQuoteWorkflowStatus(quote, parsed.meta.approval),
        );
      }).length,
    [quoteRecords],
  );
  const visibleSubtotal = useMemo(
    () =>
      filteredQuotes.reduce(
        (sum, quote) =>
          sum +
          computeQuoteTotals(quote.lineItems ?? [], quote.currency).subtotal,
        0,
      ),
    [filteredQuotes],
  );
  const hasActiveFilters = Boolean(statusFilter && statusFilter !== "all");
  const negotiationEventsByQuote = useMemo(() => {
    const grouped = new Map<string, NegotiationEvent[]>();
    negotiationEvents.forEach((event) =>
      grouped.set(event.quote_id, [
        ...(grouped.get(event.quote_id) ?? []),
        event,
      ]),
    );
    return grouped;
  }, [negotiationEvents]);
  const communicationsByQuote = useMemo(() => {
    const grouped = new Map<string, QuoteCommunication[]>();
    communications.forEach((communication) => {
      const quoteId =
        communication.quote_id ??
        (communication.related_entity === "quote"
          ? communication.related_id
          : null);
      if (!quoteId) return;
      grouped.set(quoteId, [...(grouped.get(quoteId) ?? []), communication]);
    });
    return grouped;
  }, [communications]);

  const getPreferredEditorStep = (quote: QuoteRecord): BuilderStepId => {
    const guidance = getFocusQuoteBuilderGuidance(quote, quoteSendGuard);
    return (
      guidance.steps.find((step) => step.state === "current")?.id ??
      guidance.steps.find((step) => step.state === "upcoming")?.id ??
      guidance.steps[guidance.steps.length - 1]?.id ??
      "product"
    );
  };

  const openQuoteEditor = (
    quote: QuoteRecord,
    preferredStep?: BuilderStepId,
  ) => {
    setActiveQuote(quote);
    setActiveQuoteStep(preferredStep ?? getPreferredEditorStep(quote));
  };

  const upsertQuoteRecord = (next: QuoteRecord) => {
    setQuoteRecords((current) => {
      const existingIndex = current.findIndex((item) => item.id === next.id);
      if (existingIndex === -1) return [next, ...current];
      const clone = [...current];
      clone[existingIndex] = next;
      return clone;
    });
    setActiveQuote(next);
    setActiveQuoteStep((current) => current ?? getPreferredEditorStep(next));
    setFocusQuoteId(next.id);
  };

  const runQuickAction = (quote: QuoteRecord, action: QuoteQuickAction) => {
    if (!action.run || action.disabled) return;
    if (!canManageQuotes) {
      setWorkflowNotice({
        tone: "danger",
        title: "Quote action blocked",
        description:
          readOnlyMessage ??
          "This workspace is read-only for your current role.",
      });
      return;
    }
    if (
      ["sent", "accepted", "rejected", "expired"].includes(
        String(action.run.status ?? "")
          .trim()
          .toLowerCase(),
      ) &&
      !canSendQuotes
    ) {
      setWorkflowNotice({
        tone: "danger",
        title: "Send or outcome action blocked",
        description:
          sendReadOnlyMessage ??
          "Your current role can review quotes here but cannot send or finalize them.",
      });
      return;
    }
    setWorkflowNotice(null);
    setQuickActionQuoteId(quote.id);
    startWorkflowTransition(() => {
      void updateQuoteWorkflow(
        undefined,
        buildQuickWorkflowFormData(quote, action.run!),
      )
        .then((result) => {
          if (result?.error) {
            setWorkflowNotice({
              tone: "danger",
              title: "Quote action failed",
              description: result.error,
            });
            return;
          }
          if (result?.record) upsertQuoteRecord(result.record as QuoteRecord);
          setComposer(null);
          setComposerNote("");
          setWorkflowNotice({
            tone: "success",
            title: action.label,
            description:
              result?.success ??
              `${action.label} completed for quote ${quote.id.slice(0, 8)}.`,
          });
        })
        .catch((error) => {
          setWorkflowNotice({
            tone: "danger",
            title: "Quote action failed",
            description:
              error instanceof Error
                ? error.message
                : "Unexpected quote workflow failure.",
          });
        })
        .finally(() => {
          setQuickActionQuoteId(null);
        });
    });
  };

  const submitNegotiationLog = (
    quote: QuoteRecord,
    mode: Extract<
      NegotiationComposerMode,
      "counter_offer" | "revision_requested" | "customer_reply"
    >,
  ) => {
    if (!canManageQuotes) {
      setWorkflowNotice({
        tone: "danger",
        title: "Negotiation log blocked",
        description:
          readOnlyMessage ??
          "This workspace is read-only for your current role.",
      });
      return;
    }
    setWorkflowNotice(null);
    setQuickActionQuoteId(quote.id);
    startWorkflowTransition(() => {
      const formData = new FormData();
      formData.set("quote_id", quote.id);
      formData.set("response_type", mode);
      formData.set("note", composerNote.trim());
      void logQuoteNegotiationResponse(undefined, formData)
        .then((result) => {
          if (result?.error) {
            setWorkflowNotice({
              tone: "danger",
              title: "Negotiation log failed",
              description: result.error,
            });
            return;
          }
          setComposer(null);
          setComposerNote("");
          setWorkflowNotice({
            tone: "success",
            title:
              mode === "counter_offer"
                ? "Counter-offer logged"
                : mode === "revision_requested"
                  ? "Revision request logged"
                  : "Customer response logged",
            description:
              result?.success ??
              "Customer response saved to the negotiation trail.",
          });
        })
        .catch((error) => {
          setWorkflowNotice({
            tone: "danger",
            title: "Negotiation log failed",
            description:
              error instanceof Error
                ? error.message
                : "Unexpected negotiation logging failure.",
          });
        })
        .finally(() => {
          setQuickActionQuoteId(null);
        });
    });
  };

  const focusQuoteMeta = focusQuote
    ? getQuoteApprovalStateValue(focusQuote)
    : null;
  const focusBuilderGuidance = focusQuote
    ? getFocusQuoteBuilderGuidance(focusQuote, quoteSendGuard)
    : null;
  const focusQuoteTotals = focusQuote
    ? computeQuoteTotals(focusQuote.lineItems ?? [], focusQuote.currency)
    : null;
  const focusQuoteVersions = focusQuote
    ? quoteVersions
        .filter((version) => version.quote_id === focusQuote.id)
        .sort(
          (left, right) =>
            Number(right.version_no ?? 0) - Number(left.version_no ?? 0) ||
            String(right.created_at ?? "").localeCompare(
              String(left.created_at ?? ""),
            ),
        )
    : [];
  const currentFocusedVersion = focusQuote
    ? (focusQuoteVersions.find(
        (version) => version.id === focusQuote.current_version_id,
      ) ??
      focusQuoteVersions[0] ??
      null)
    : null;
  const sentFocusedVersion =
    focusQuoteVersions.find(
      (version) =>
        version.sent_at ||
        String(version.status ?? "").toLowerCase() === "sent",
    ) ?? null;
  const approvedFocusedVersion =
    focusQuoteVersions.find(
      (version) =>
        version.approved_at ||
        String(version.status ?? "").toLowerCase() === "approved",
    ) ?? null;
  const focusApprovalAction = focusQuote ? getApprovalAction(focusQuote) : null;
  const focusTrustContract = focusQuoteMeta
    ? getQuoteTrustContract({
        status: focusQuoteMeta.status,
        approvalRequired: focusQuoteMeta.approvalRequired,
        approvalState: focusQuoteMeta.approvalState as any,
      })
    : null;
  const focusSendAction = focusQuote
    ? getSendAction(focusQuote, quoteSendGuard)
    : null;
  const focusAcceptAction = focusQuote
    ? getOutcomeAction(focusQuote, "accepted")
    : null;
  const focusRejectAction = focusQuote
    ? getOutcomeAction(focusQuote, "rejected")
    : null;
  const focusCommunications = focusQuote
    ? (communicationsByQuote.get(focusQuote.id) ?? [])
    : [];
  const focusNegotiationEvents = focusQuote
    ? (negotiationEventsByQuote.get(focusQuote.id) ?? [])
    : [];
  const focusNegotiationSummary =
    focusNegotiationEvents[0]?.message ??
    focusCommunications[0]?.summary ??
    null;
  const activeComposerMode =
    focusQuote && composer?.quoteId === focusQuote.id ? composer.mode : null;
  const composerActive = activeComposerMode
    ? getNegotiationComposerCopy(activeComposerMode)
    : null;
  const focusSendRun = focusSendAction?.run ?? null;
  const focusAcceptRun = focusAcceptAction?.run ?? null;
  const focusRejectRun = focusRejectAction?.run ?? null;

  return (
    <section className="space-y-4">
      <SectionCard className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                Quote workflow
              </p>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getPricingReadinessClasses(pricingSnapshot.pricingReadiness)}`}
              >
                {getPricingReadinessLabel(pricingSnapshot.pricingReadiness)}
              </span>
            </div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              One commercial lane for Product, Pricing, Terms, Review, and Send
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Keep the current quote visible, preserve the guided builder
              posture after save, and open the deep editor only when pricing
              detail needs more than the fast lane.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={!canManageQuotes}
            className="rounded-[10px] bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {canManageQuotes ? "New quote" : "Read-only role"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
            {filteredQuotes.length} visible
          </span>
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
            {pendingApprovalCount} pending approval
          </span>
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
            {customerActiveCount} customer active
          </span>
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
            {visibleSubtotal.toFixed(2)} visible subtotal
          </span>
          <span className="rounded-full bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
            {quoteSendGuard?.blockerCount ?? 0} send blockers
          </span>
        </div>

        {quoteSendGuard?.blockerCount ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {quoteSendGuard.blockerReasons.slice(0, 3).map((reason) => (
              <span
                key={reason}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
              >
                {reason}
              </span>
            ))}
          </div>
        ) : null}
      </SectionCard>

      {focusQuote ? (
        <SectionCard className="overflow-hidden border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.98))] p-0">
          {/* Sprint 5 Batch 1 — lock-state banner.
              Renders a clear read-only indicator when the focused quote
              has reached a terminal or customer-facing status. Action
              buttons remain visible but disabled via canManageQuotes logic;
              this banner explains why. */}
          {focusQuote && isQuoteLocked(focusQuoteMeta?.status ?? focusQuote.status) ? (
            <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3 sm:px-6">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-900">
                ⊘
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Quote locked —{" "}
                  {String(focusQuoteMeta?.status ?? focusQuote.status).replaceAll("_", " ")}
                </p>
                <p className="mt-0.5 text-sm text-amber-800">
                  {getQuoteLockReason(focusQuoteMeta?.status ?? focusQuote.status)}
                </p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                    Quote fast lane
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                    Focus quote {focusQuote.id.slice(0, 8)}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">
                    Keep the next commercial move obvious from one quote surface
                    instead of scanning a separate review dashboard.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getQuoteStatusBadgeClasses(focusQuoteMeta?.status ?? "draft")}`}
                  >
                    {String(focusQuoteMeta?.status ?? "draft").replaceAll(
                      "_",
                      " ",
                    )}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getApprovalBadgeClasses((focusQuoteMeta?.approvalState ?? "not_required") as any)}`}
                  >
                    approval{" "}
                    {String(
                      focusQuoteMeta?.approvalState ?? "not_required",
                    ).replaceAll("_", " ")}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  {focusQuoteTotals?.currency}{" "}
                  {focusQuoteTotals?.subtotal.toFixed(2)} subtotal
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  {focusQuoteTotals?.lineItemCount ?? 0} line items
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  Basis {focusBuilderGuidance?.basisLabel ?? "FOB"}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  Template{" "}
                  {focusBuilderGuidance?.templateLabel ?? "Manual pricing"}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  Updated {formatDateTime(focusQuote.updated_at)}
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  Current version{" "}
                  {currentFocusedVersion?.version_no
                    ? `v${currentFocusedVersion.version_no}`
                    : "pending sync"}
                </span>
              </div>

              <div className="mt-6 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Product → Pricing → Terms → Review → Send
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {focusBuilderGuidance?.steps.map((step) => (
                      <span
                        key={step.id}
                        className={`inline-flex rounded-full border px-3 py-2 text-sm font-medium ${getStepClasses(step.state)}`}
                      >
                        {step.label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[1rem] bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      {focusBuilderGuidance?.title ?? "Builder posture"}
                    </p>
                    <p className="mt-2">
                      {focusBuilderGuidance?.description ??
                        "Keep the quote in the guided builder flow."}
                    </p>
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Validation prompts
                        </p>
                        <ul className="mt-2 space-y-2 text-xs text-slate-600">
                          {(focusBuilderGuidance?.validationPrompts ?? []).map(
                            (prompt) => (
                              <li key={prompt}>• {prompt}</li>
                            ),
                          )}
                        </ul>
                      </div>
                      <div className="rounded-[1rem] border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Recommendations
                        </p>
                        <ul className="mt-2 space-y-2 text-xs text-slate-600">
                          {(focusBuilderGuidance?.recommendations ?? []).map(
                            (item) => (
                              <li key={item}>• {item}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {focusBuilderGuidance?.steps.map((step) => (
                      <div
                        key={`${step.id}-detail`}
                        className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-900">
                            {step.label}
                          </p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStepClasses(step.state)}`}
                          >
                            {step.state}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-600">
                          {step.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Operator actions
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Keep the common daily actions here. Open the full editor
                        only when pricing or approvals need a deeper pass.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openQuoteEditor(focusQuote)}
                      disabled={!canManageQuotes}
                      className="rounded-[10px] bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {canManageQuotes
                        ? `Continue ${getPreferredEditorStep(focusQuote).replace("_", " ")} step`
                        : "Read-only quote details"}
                    </button>
                    {focusApprovalAction ? (
                      <button
                        type="button"
                        disabled={
                          focusApprovalAction.disabled ||
                          (isWorkflowPending &&
                            quickActionQuoteId === focusQuote.id)
                        }
                        onClick={() =>
                          runQuickAction(focusQuote, focusApprovalAction)
                        }
                        className="rounded-[10px] border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isWorkflowPending &&
                        quickActionQuoteId === focusQuote.id &&
                        focusApprovalAction.run
                          ? "Saving…"
                          : focusApprovalAction.label}
                      </button>
                    ) : null}
                    {focusSendAction ? (
                      <button
                        type="button"
                        disabled={
                          !canSendQuotes ||
                          focusSendAction.disabled ||
                          (isWorkflowPending &&
                            quickActionQuoteId === focusQuote.id)
                        }
                        onClick={() =>
                          setComposer({ quoteId: focusQuote.id, mode: "send" })
                        }
                        className="rounded-[10px] border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isWorkflowPending &&
                        quickActionQuoteId === focusQuote.id &&
                        activeComposerMode === "send"
                          ? "Saving…"
                          : focusSendAction.label}
                      </button>
                    ) : null}
                    {focusAcceptAction ? (
                      <button
                        type="button"
                        disabled={
                          !canSendQuotes ||
                          focusAcceptAction.disabled ||
                          (isWorkflowPending &&
                            quickActionQuoteId === focusQuote.id)
                        }
                        onClick={() =>
                          setComposer({
                            quoteId: focusQuote.id,
                            mode: "accepted",
                          })
                        }
                        className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {focusAcceptAction.label}
                      </button>
                    ) : null}
                    {focusRejectAction ? (
                      <button
                        type="button"
                        disabled={
                          !canSendQuotes ||
                          focusRejectAction.disabled ||
                          (isWorkflowPending &&
                            quickActionQuoteId === focusQuote.id)
                        }
                        onClick={() =>
                          setComposer({
                            quoteId: focusQuote.id,
                            mode: "rejected",
                          })
                        }
                        className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {focusRejectAction.label}
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">
                        Approval lane
                      </p>
                      <p className="mt-2">
                        {focusApprovalAction?.description ??
                          "Approval is not the active bottleneck for this quote."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">Send lane</p>
                      <p className="mt-2">
                        {focusSendAction?.description ??
                          "Send is not the active bottleneck for this quote."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                      <p className="font-semibold text-slate-900">
                        Customer response lane
                      </p>
                      <p className="mt-2">
                        {focusNegotiationSummary ??
                          "Counter-offers, revision requests, and customer replies should be logged here before reps move to the next quote."}
                      </p>
                    </div>
                  </div>
                  {focusTrustContract ? (
                    <div className="mt-4">
                      <QuoteTrustContractPreview contract={focusTrustContract} />
                    </div>
                  ) : null}
                  <div className="mt-4 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Version history
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Version visibility, exact-target remediation, checkpoint return continuity, checkpoint re-entry continuity, footer rationale, real submit enforcement, final-step submit locking, blocked-submit handoff, and caution confirmation are already live here. Sprint 4 quote-builder core remains formally closed. Sprint 5 Batch 1 has now started with a safe runtime slice here: approval gate, audit-event map, and lock posture are visible in the fast lane before deeper trust enforcement begins.
                      </p>
                      <div className="mt-4 space-y-2">
                        {focusQuoteVersions.length ? (
                          focusQuoteVersions.map((version) => (
                            <div
                              key={version.id}
                              className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-slate-900">
                                  v{version.version_no ?? "—"} ·{" "}
                                  {String(version.status ?? "draft").replaceAll(
                                    "_",
                                    " ",
                                  )}
                                </p>
                                <span className="text-xs text-slate-500">
                                  {formatDateTime(
                                    version.sent_at ??
                                      version.approved_at ??
                                      version.created_at,
                                  )}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                                <span>
                                  {version.approved_at
                                    ? "Approved"
                                    : "Awaiting approval"}
                                </span>
                                <span>
                                  {version.sent_at ? "Sent" : "Not sent"}
                                </span>
                                <span>
                                  {version.id === currentFocusedVersion?.id
                                    ? "Current version"
                                    : "Prior version"}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[1rem] border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
                            No quote versions are synced to this workspace yet.
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Send checkpoint history
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Keep the latest approval and send posture visible
                        without jumping ahead into trust-layer redesign.
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Current version
                          </p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {currentFocusedVersion?.version_no
                              ? `v${currentFocusedVersion.version_no}`
                              : "Pending sync"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {currentFocusedVersion
                              ? `Created ${formatDateTime(currentFocusedVersion.created_at)}`
                              : "No linked version has been created yet."}
                          </p>
                        </div>
                        <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Latest sent
                          </p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {sentFocusedVersion?.version_no
                              ? `v${sentFocusedVersion.version_no}`
                              : "Not sent yet"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {sentFocusedVersion?.sent_at
                              ? `Sent ${formatDateTime(sentFocusedVersion.sent_at)}`
                              : "The quote has not been sent from a synced version yet."}
                          </p>
                        </div>
                        <div className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                            Approval checkpoint
                          </p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {approvedFocusedVersion?.version_no
                              ? `v${approvedFocusedVersion.version_no}`
                              : "No approved version yet"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {approvedFocusedVersion?.approved_at
                              ? `Approved ${formatDateTime(approvedFocusedVersion.approved_at)}`
                              : "Approval timing will appear here once a synced version is approved."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Negotiation compression
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Log counter-offers, revision decisions, and customer
                          replies from the same fast lane instead of bouncing
                          into the full editor.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setComposer({
                            quoteId: focusQuote.id,
                            mode: "counter_offer",
                          });
                          setComposerNote("");
                        }}
                        disabled={!canManageQuotes}
                        className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Log counter-offer
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComposer({
                            quoteId: focusQuote.id,
                            mode: "revision_requested",
                          });
                          setComposerNote("");
                        }}
                        disabled={!canManageQuotes}
                        className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Log revision request
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComposer({
                            quoteId: focusQuote.id,
                            mode: "customer_reply",
                          });
                          setComposerNote("");
                        }}
                        disabled={!canManageQuotes}
                        className="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Log customer response
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setComposer({
                            quoteId: focusQuote.id,
                            mode: "revision_ready",
                          });
                          setComposerNote("");
                        }}
                        disabled={!canManageQuotes}
                        className="rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark revision ready
                      </button>
                    </div>
                    {composerActive && activeComposerMode ? (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {composerActive.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {composerActive.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setComposer(null);
                              setComposerNote("");
                            }}
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
                          >
                            Close
                          </button>
                        </div>
                        <textarea
                          value={composerNote}
                          onChange={(event) =>
                            setComposerNote(event.target.value)
                          }
                          rows={3}
                          placeholder="Add the customer context, commercial note, or next decision…"
                          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-brand-300"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          {activeComposerMode === "send" &&
                          focusSendAction &&
                          focusSendRun ? (
                            <button
                              type="button"
                              onClick={() =>
                                runQuickAction(focusQuote, {
                                  ...focusSendAction,
                                  run: {
                                    ...focusSendRun,
                                    plainNotes:
                                      composerNote.trim() ||
                                      focusSendRun.plainNotes,
                                  },
                                })
                              }
                              disabled={
                                isWorkflowPending &&
                                quickActionQuoteId === focusQuote.id
                              }
                              className="rounded-[10px] bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              {composerActive.cta}
                            </button>
                          ) : null}
                          {activeComposerMode === "accepted" &&
                          focusAcceptAction &&
                          focusAcceptRun ? (
                            <button
                              type="button"
                              onClick={() =>
                                runQuickAction(focusQuote, {
                                  ...focusAcceptAction,
                                  run: {
                                    ...focusAcceptRun,
                                    plainNotes:
                                      composerNote.trim() ||
                                      focusAcceptRun.plainNotes,
                                  },
                                })
                              }
                              disabled={
                                isWorkflowPending &&
                                quickActionQuoteId === focusQuote.id
                              }
                              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {composerActive.cta}
                            </button>
                          ) : null}
                          {activeComposerMode === "rejected" &&
                          focusRejectAction &&
                          focusRejectRun ? (
                            <button
                              type="button"
                              onClick={() =>
                                runQuickAction(focusQuote, {
                                  ...focusRejectAction,
                                  run: {
                                    ...focusRejectRun,
                                    plainNotes:
                                      composerNote.trim() ||
                                      focusRejectRun.plainNotes,
                                  },
                                })
                              }
                              disabled={
                                isWorkflowPending &&
                                quickActionQuoteId === focusQuote.id
                              }
                              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                              {composerActive.cta}
                            </button>
                          ) : null}
                          {activeComposerMode === "revision_ready" ? (
                            <button
                              type="button"
                              onClick={() =>
                                runQuickAction(focusQuote, {
                                  label: "Revision ready",
                                  description:
                                    "Quote revised and ready for customer response.",
                                  run: {
                                    status: "revised",
                                    approvalRequired:
                                      focusQuoteMeta?.approvalRequired ?? false,
                                    approvalState:
                                      focusQuoteMeta?.approvalState ??
                                      "not_required",
                                    plainNotes:
                                      composerNote.trim() ||
                                      "Quote revised and ready from the fast lane.",
                                  },
                                })
                              }
                              disabled={
                                isWorkflowPending &&
                                quickActionQuoteId === focusQuote.id
                              }
                              className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                              {composerActive.cta}
                            </button>
                          ) : null}
                          {activeComposerMode === "counter_offer" ||
                          activeComposerMode === "revision_requested" ||
                          activeComposerMode === "customer_reply" ? (
                            <button
                              type="button"
                              onClick={() =>
                                submitNegotiationLog(
                                  focusQuote,
                                  activeComposerMode,
                                )
                              }
                              disabled={
                                isWorkflowPending &&
                                quickActionQuoteId === focusQuote.id
                              }
                              className="rounded-[10px] bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                            >
                              {composerActive.cta}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-2">
                      {focusNegotiationEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">
                              {String(
                                event.event_type ?? "negotiation",
                              ).replaceAll("_", " ")}
                            </p>
                            <span className="text-xs text-slate-500">
                              {event.created_at
                                ? formatDateTime(event.created_at)
                                : "No timestamp"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {event.actor_name ?? event.actor_type ?? "System"}
                          </p>
                          <p className="mt-2">
                            {event.message ?? "Negotiation event recorded."}
                          </p>
                        </div>
                      ))}
                      {!focusNegotiationEvents.length ? (
                        <p className="text-sm text-slate-500">
                          No negotiation events captured yet. Use the customer
                          response lane above to start a cleaner trail.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-white/80 p-5 sm:p-6 xl:border-l xl:border-t-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Quotes needing attention
              </p>
              <div className="mt-4 space-y-3">
                {focusableQuotes.slice(0, 5).map((quote) => {
                  const meta = getQuoteApprovalStateValue(quote);
                  const totals = computeQuoteTotals(
                    quote.lineItems ?? [],
                    quote.currency,
                  );
                  const isFocused = focusQuoteId === quote.id;
                  return (
                    <button
                      key={quote.id}
                      type="button"
                      onClick={() => setFocusQuoteId(quote.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${isFocused ? "border-brand-200 bg-brand-50/60 shadow-soft" : isQuoteLocked(meta.status) ? "border-amber-100 bg-amber-50/40 hover:border-amber-200" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className={`font-semibold ${isQuoteLocked(meta.status) ? "text-slate-600" : "text-slate-900"}`}>
                          Quote {quote.id.slice(0, 8)}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {isQuoteLocked(meta.status) ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                              ⊘ locked
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getQuoteStatusBadgeClasses(meta.status)}`}
                          >
                            {meta.status.replaceAll("_", " ")}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                        <span>
                          {totals.currency} {totals.subtotal.toFixed(2)}
                        </span>
                        <span>· {totals.lineItemCount} lines</span>
                        <span>· {formatDateTime(quote.updated_at)}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        {meta.approvalRequired
                          ? `Approval ${meta.approvalState.replaceAll("_", " ")}`
                          : "No approval required"}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-[1rem] bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Daily sales rule</p>
                <p className="mt-2">
                  Keep one quote in focus, clear approval or send blockers
                  first, then move to the next quote instead of bouncing through
                  every card on the page.
                </p>
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Saved views
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {viewButtons.map((view) => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setSavedView(view.id)}
                  className={
                    savedView === view.id
                      ? "rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
                      : "rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
                  }
                  aria-pressed={savedView === view.id}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_220px_auto]">
            <FilterField label="Save current view">
              <input
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="Save current quote view"
                aria-label="Save current quote view"
              />
            </FilterField>
            <FilterField label="Sort by">
              <select
                value={sortMode}
                onChange={(event) =>
                  setSortMode(event.target.value as QuoteSortMode)
                }
                aria-label="Sort quotes"
              >
                <option value="updated">Updated newest</option>
                <option value="created">Created newest</option>
                <option value="value">Highest value</option>
              </select>
            </FilterField>
            <div className="flex flex-wrap items-end gap-2">
              <button
                type="button"
                disabled={!viewName.trim() || isViewPending}
                onClick={() => {
                  startViewTransition(async () => {
                    const formData = new FormData();
                    formData.set("entity_type", "quotes");
                    formData.set("name", viewName.trim());
                    formData.set(
                      "filter_model",
                      JSON.stringify(currentFilterModel),
                    );
                    formData.set(
                      "sort_model",
                      JSON.stringify(currentSortModel),
                    );
                    formData.set(
                      "redirect_path",
                      redirectPath ?? `/leads/${leadId}/quote`,
                    );
                    await saveWorkspaceView(formData);
                    setPreferenceFlash(
                      `Saved view “${viewName.trim()}”. Refresh to load the latest view list.`,
                    );
                    setViewName("");
                  });
                }}
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              >
                Save view
              </button>
              <button
                type="button"
                disabled={isViewPending}
                onClick={() => {
                  startViewTransition(async () => {
                    const formData = new FormData();
                    formData.set("entity_type", "quotes");
                    formData.set(
                      "redirect_path",
                      redirectPath ?? `/leads/${leadId}/quote`,
                    );
                    if (savedViews.some((view) => view.id === savedView)) {
                      formData.set("saved_view_id", savedView);
                    } else {
                      formData.set("built_in_view_key", savedView);
                    }
                    await saveWorkspaceDefaultView(formData);
                    setPreferenceFlash("Default quote view updated.");
                  });
                }}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Set default
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <FilterField label="Workflow filter">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter quotes by status"
              >
                <option value="">All workflow states</option>
                <option value="pending_approval">Pending approval</option>
                <option value="customer_active">Customer active</option>
                <option value="finished">Finished</option>
                {QUOTE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </FilterField>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                {filteredQuotes.length} visible
              </span>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => setStatusFilter("")}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>

      {readOnlyMessage ? (
        <StateMessage
          title="Read-only quote workspace"
          description={`${readOnlyMessage} Fast-lane actions, draft creation, and quote edits are disabled on this screen.`}
          tone="warning"
        />
      ) : null}
      {!canManageQuotes && !quoteRecords.length ? (
        <StateMessage
          title="No quote draft can be created from this role"
          description="Open the lead command center or ask a teammate with lead-manage access to create the first quote for this lead."
          tone="warning"
        />
      ) : null}
      {sendReadOnlyMessage && canManageQuotes && !canSendQuotes ? (
        <StateMessage
          title="Send and outcome actions are limited"
          description={`${sendReadOnlyMessage} You can still draft and revise quotes here, but send, accept, reject, and other final commercial actions stay blocked.`}
          tone="warning"
        />
      ) : null}
      {!rfqs.length ? (
        <StateMessage
          title="No RFQ linked yet"
          description="This quote workspace can still draft commercial pricing from mapped products, but RFQ supplier context is empty until an RFQ is created for this lead."
          tone="neutral"
        />
      ) : null}
      {preferenceFlash ? (
        <StateMessage
          title="Workspace preference updated"
          description={preferenceFlash}
          tone="success"
        />
      ) : null}
      {workflowNotice ? (
        <StateMessage
          title={workflowNotice.title}
          description={workflowNotice.description}
          tone={workflowNotice.tone}
        />
      ) : null}

      {filteredQuotes.length ? (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => {
            const parsed = parseQuoteWorkflow(quote.notes);
            const approvalState =
              parsed.meta.approval?.state ??
              (parsed.meta.approval?.required ? "pending" : "not_required");
            const status = getQuoteWorkflowStatus(quote, parsed.meta.approval);
            const totals = computeQuoteTotals(
              quote.lineItems ?? [],
              quote.currency,
            );
            const template = getPricingTemplate(parsed.meta.templateId ?? null);
            const isFocused = focusQuoteId === quote.id;

            return (
              <SectionCard
                key={quote.id}
                className={`p-4 sm:p-5 ${isFocused ? "border-brand-200 ring-1 ring-brand-100" : ""}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        Quote {quote.id.slice(0, 8)}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getQuoteStatusBadgeClasses(status)}`}
                      >
                        {status.replaceAll("_", " ")}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getApprovalBadgeClasses(approvalState as any)}`}
                      >
                        approval {approvalState.replaceAll("_", " ")}
                      </span>
                      {isQuoteLocked(status) ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                          ⊘ locked
                        </span>
                      ) : null}
                      {isFocused ? (
                        <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
                          focus quote
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Created {formatDateTime(quote.created_at)}</span>
                      <span>Currency {totals.currency}</span>
                      <span>{totals.lineItemCount} line items</span>
                      <span>Template {template?.name ?? "manual"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFocusQuoteId(quote.id)}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {isFocused ? "In fast lane" : "Bring to fast lane"}
                    </button>
                    {canManageQuotes ? (
                      <GenerateQuoteCoverNoteButton
                        leadId={leadId}
                        quoteId={quote.id}
                        compact
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openQuoteEditor(quote)}
                      disabled={!canManageQuotes}
                      className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {canManageQuotes
                        ? `Continue ${getPreferredEditorStep(quote).replace("_", " ")} step`
                        : "View quote"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Qty</th>
                          <th className="px-3 py-2">Catalog</th>
                          <th className="px-3 py-2">Final</th>
                          <th className="px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(quote.lineItems ?? []).map((item) => {
                          const fallbackProduct = getProductCatalogFallback(
                            item,
                            products,
                          );
                          const catalogValue =
                            typeof item.catalog_price_amount === "number"
                              ? item.catalog_price_amount
                              : (fallbackProduct?.catalogPriceAmount ?? null);
                          const catalogCurrency =
                            item.catalog_price_currency ??
                            fallbackProduct?.catalogPriceCurrency ??
                            quote.currency ??
                            null;
                          const finalValue =
                            typeof item.unit_price === "number"
                              ? item.unit_price
                              : catalogValue;
                          const finalCurrency =
                            item.currency ??
                            catalogCurrency ??
                            quote.currency ??
                            null;
                          return (
                            <tr
                              key={item.id}
                              className="border-t border-slate-100"
                            >
                              <td className="px-3 py-2 text-slate-700">
                                {item.notes ||
                                  fallbackProduct?.name ||
                                  "Line item"}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {item.quantity}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {formatQuoteMoney(
                                  catalogValue,
                                  catalogCurrency,
                                )}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {formatQuoteMoney(finalValue, finalCurrency)}
                                {item.is_price_overridden ? (
                                  <p className="mt-1 text-[11px] font-medium text-amber-700">
                                    override
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                {formatQuoteMoney(
                                  (finalValue ?? 0) * item.quantity,
                                  finalCurrency,
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-[1rem] bg-slate-50 p-4 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-900">
                        Subtotal:
                      </span>{" "}
                      {totals.currency} {totals.subtotal.toFixed(2)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-slate-900">
                        Approval actor:
                      </span>{" "}
                      {parsed.meta.approval?.actorName ?? "Workflow-derived"}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-slate-900">
                        Approval timestamp:
                      </span>{" "}
                      {formatDateTime(parsed.meta.approval?.actedAt)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-slate-900">
                        Pricing posture:
                      </span>{" "}
                      {(quote.lineItems ?? []).some(
                        (item) => item.is_price_overridden,
                      )
                        ? "Contains line overrides against catalog baseline."
                        : "All lines using catalog baseline."}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium text-slate-900">
                        Send blockers:
                      </span>{" "}
                      {quoteSendGuard?.blockerCount
                        ? `${quoteSendGuard.blockerCount} active`
                        : "Ready"}
                    </p>
                    {quoteSendGuard?.blockerCount ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800">
                        {quoteSendGuard.blockerReasons
                          .slice(0, 3)
                          .map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                      </ul>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap">
                      <span className="font-medium text-slate-900">Notes:</span>{" "}
                      {parsed.plainNotes || "No notes"}
                    </p>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Negotiation review
                      </p>
                      <div className="mt-2 space-y-2">
                        {(negotiationEventsByQuote.get(quote.id) ?? [])
                          .slice(0, 3)
                          .map((event) => (
                            <div
                              key={event.id}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <p className="text-sm font-medium text-slate-900">
                                {String(event.event_type || "event").replace(
                                  /_/g,
                                  " ",
                                )}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {event.actor_name ||
                                  event.actor_type ||
                                  "system"}{" "}
                                · {formatDateTime(event.created_at)}
                              </p>
                              {event.message ? (
                                <p className="mt-1 text-xs text-slate-600">
                                  {event.message}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        {!(negotiationEventsByQuote.get(quote.id) ?? [])
                          .length ? (
                          <p className="text-xs text-slate-500">
                            No negotiation events captured yet.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        AI-assisted communication provenance
                      </p>
                      <div className="mt-2 space-y-2">
                        {(communicationsByQuote.get(quote.id) ?? [])
                          .slice(0, 3)
                          .map((communication: QuoteCommunication) => {
                            const metadata =
                              communication.metadata &&
                              typeof communication.metadata === "object"
                                ? (communication.metadata as Record<
                                    string,
                                    unknown
                                  >)
                                : null;
                            const operatorNote =
                              typeof metadata?.operator_notes === "string" &&
                              metadata.operator_notes.trim()
                                ? metadata.operator_notes.trim()
                                : null;
                            return (
                              <div
                                key={communication.id}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                              >
                                <p className="text-sm font-medium text-slate-900">
                                  {communication.subject ||
                                    communication.summary ||
                                    "Quote communication draft"}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {communication.draft_source === "ai"
                                    ? "AI-assisted"
                                    : "Manual"}{" "}
                                  · {communication.status.replace(/_/g, " ")} ·{" "}
                                  {formatDateTime(communication.created_at)}
                                </p>
                                {operatorNote ? (
                                  <p className="mt-1 text-xs text-slate-600">
                                    Operator note: {operatorNote}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        {!(communicationsByQuote.get(quote.id) ?? []).length ? (
                          <p className="text-xs text-slate-500">
                            No quote-linked communication drafts yet.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No quotes match this view"
          description={
            hasActiveFilters
              ? "Clear the current workflow filter to bring hidden quotes back into view."
              : canManageQuotes
                ? "Create a quote to start managing pricing, approvals, and customer-facing output."
                : "No quotes are visible yet, and your current role cannot create the first draft from this workspace."
          }
          actionHref={
            canManageQuotes
              ? rfqs.length
                ? undefined
                : rfqWorkspaceHref
              : leadCommandHref
          }
          actionLabel={
            canManageQuotes
              ? rfqs.length
                ? undefined
                : "Create RFQ first"
              : "Return to lead"
          }
        />
      )}

      <RightDrawer
        open={canManageQuotes && createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create quote"
      >
        {canManageQuotes ? (
          <QuoteCreateWizardForm
            leadId={leadId}
            rfqs={rfqs}
            products={products}
            quoteSendGuard={quoteSendGuard}
            onClose={() => setCreateOpen(false)}
            onSaved={upsertQuoteRecord}
          />
        ) : null}
      </RightDrawer>
      <RightDrawer
        open={Boolean(activeQuote)}
        onClose={() => {
          setActiveQuote(null);
          setActiveQuoteStep(null);
        }}
        title={canManageQuotes ? "Manage quote workflow" : "Quote details"}
      >
        {activeQuote && canManageQuotes ? (
          <QuoteEditWizardForm
            key={`${activeQuote.id}-${activeQuoteStep ?? "product"}`}
            quote={activeQuote as any}
            products={products}
            quoteVersions={quoteVersions as any}
            quoteSendGuard={quoteSendGuard}
            initialStepId={activeQuoteStep ?? undefined}
            onClose={() => {
              setActiveQuote(null);
              setActiveQuoteStep(null);
            }}
            onSaved={upsertQuoteRecord as any}
          />
        ) : activeQuote ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">
              Read-only quote details
            </p>
            <p>
              {readOnlyMessage ??
                "This role can review quote details here but cannot edit the workflow."}
            </p>
            <Link
              href={leadCommandHref}
              className="inline-flex rounded-2xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-white"
            >
              Return to lead command center
            </Link>
          </div>
        ) : null}
      </RightDrawer>
    </section>
  );
}
