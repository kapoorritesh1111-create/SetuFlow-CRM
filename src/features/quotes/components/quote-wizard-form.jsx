"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { SectionCard } from "@/components/ui/section-card";
import { WizardShell, WizardStepBody, WizardValidationSummary, } from "@/components/ui/wizard-shell";
import { CommercialWizardFooter } from "@/components/ui/commercial-wizard-footer";
import { createQuote, updateQuoteWorkflow, } from "@/features/quotes/server/actions";
import { APPROVAL_STATES, getApprovalBadgeClasses, } from "@/lib/approvalRouting";
import { PRICING_TEMPLATES, applyPricingTemplate, getPricingTemplate, } from "@/lib/pricingTemplates";
import { QUOTE_STATUSES, computeQuoteTotals, getQuoteStatusBadgeClasses, getQuoteWorkflowStatus, parseQuoteWorkflow, } from "@/lib/quoteWorkflow";
import { formatDateTime } from "@/lib/utils";
const QUOTE_CREATE_STEPS = [
    {
        id: "product",
        title: "Product context",
        shortLabel: "Product",
        description: "Choose RFQ linkage, template, basis, and currency before drafting commercial detail.",
    },
    {
        id: "pricing",
        title: "Pricing lines",
        shortLabel: "Pricing",
        description: "Keep product and price linkage inside the same commercial flow.",
    },
    {
        id: "terms",
        title: "Terms and posture",
        shortLabel: "Terms",
        description: "Set workflow status, approval posture, and internal terms without leaving the builder.",
    },
    {
        id: "review",
        title: "Review draft",
        shortLabel: "Review",
        description: "Confirm totals, workflow posture, and draft structure before the send checkpoint.",
    },
    {
        id: "send",
        title: "Send checkpoint",
        shortLabel: "Send",
        description: "Make blockers and approval requirements explicit before the quote can move out.",
    },
];
const QUOTE_EDIT_STEPS = [
    {
        id: "product",
        title: "Workflow context",
        shortLabel: "Context",
        description: "Adjust workflow context without changing routing or page architecture.",
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
        description: "Keep send blockers and approval posture explicit before the quote leaves the team.",
    },
];
function FilterField({ label, children, }) {
    return (<label className="block text-sm text-slate-600">
      <span className="mb-2 block font-medium text-slate-700">{label}</span>
      {children}
    </label>);
}
function inputClassName() {
    return "min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400";
}
function normalizeCurrency(value) {
    return value
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 3);
}
function normalizePricingBasis(value) {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase();
    if (normalized === "ex_factory" || normalized === "ex-factory")
        return "ex_factory";
    if (normalized === "cif" || normalized === "cif")
        return "cif";
    return "fob";
}
function pricingBasisLabel(value) {
    if (value === "ex_factory")
        return "Ex-Factory";
    if (value === "cif")
        return "CIF";
    return "FOB";
}
function getProductBasisAmount(product, basis) {
    if (!product)
        return null;
    if (basis === "ex_factory")
        return typeof product.exFactoryPriceAmount === "number"
            ? product.exFactoryPriceAmount
            : product.catalogPriceAmount;
    if (basis === "cif")
        return typeof product.cifBasePriceAmount === "number"
            ? product.cifBasePriceAmount
            : typeof product.fobPriceAmount === "number"
                ? product.fobPriceAmount
                : product.catalogPriceAmount;
    return typeof product.fobPriceAmount === "number"
        ? product.fobPriceAmount
        : product.catalogPriceAmount;
}
function buildLineFromProduct(product, currency, pricingBasis = "fob") {
    const normalizedCurrency = normalizeCurrency(product?.catalogPriceCurrency || currency) || "USD";
    const basisAmount = getProductBasisAmount(product, pricingBasis);
    return {
        product_id: product?.id ?? "",
        product_variant_id: product?.defaultVariantId ?? "",
        catalog_price_id: product?.catalogPriceId ?? "",
        catalog_price_amount: typeof basisAmount === "number" ? basisAmount : null,
        catalog_price_currency: normalizedCurrency,
        quantity: typeof product?.moqValue === "number" && product.moqValue > 0
            ? product.moqValue
            : 1,
        unit_price: typeof basisAmount === "number" ? basisAmount : 0,
        currency: normalizedCurrency,
        override_reason: "",
        notes: "",
    };
}
function hydrateLineFromProduct(line, product, currency, pricingBasis) {
    const next = buildLineFromProduct(product, currency, pricingBasis);
    return { ...line, ...next, notes: line.notes ?? "" };
}
function hydrateExistingLineWithCatalog(line, products, currency, pricingBasis = "fob") {
    const matchedProduct = products.find((product) => product.id === line.product_id) ??
        products.find((product) => product.defaultVariantId === line.product_variant_id);
    const fallback = buildLineFromProduct(matchedProduct, currency, pricingBasis);
    const catalogPriceAmount = typeof line.catalog_price_amount === "number"
        ? line.catalog_price_amount
        : typeof getProductBasisAmount(matchedProduct, pricingBasis) === "number"
            ? getProductBasisAmount(matchedProduct, pricingBasis)
            : fallback.catalog_price_amount;
    const normalizedCurrency = normalizeCurrency(line.currency ||
        line.catalog_price_currency ||
        matchedProduct?.catalogPriceCurrency ||
        currency) || "USD";
    return {
        product_id: line.product_id ?? matchedProduct?.id ?? fallback.product_id,
        product_variant_id: line.product_variant_id ??
            matchedProduct?.defaultVariantId ??
            fallback.product_variant_id,
        catalog_price_id: line.catalog_price_id ??
            matchedProduct?.catalogPriceId ??
            fallback.catalog_price_id,
        catalog_price_amount: catalogPriceAmount,
        catalog_price_currency: normalizeCurrency(line.catalog_price_currency ||
            matchedProduct?.catalogPriceCurrency ||
            normalizedCurrency) || "USD",
        quantity: typeof line.quantity === "number" && line.quantity > 0
            ? line.quantity
            : fallback.quantity,
        unit_price: typeof line.unit_price === "number"
            ? line.unit_price
            : (catalogPriceAmount ?? fallback.unit_price),
        currency: normalizedCurrency,
        override_reason: line.override_reason ?? "",
        notes: line.notes ?? "",
    };
}
function isLinePriceOverridden(line) {
    return (typeof line.catalog_price_amount === "number" &&
        Number(line.unit_price) !== Number(line.catalog_price_amount));
}
function formatMoney(amount, currency) {
    if (typeof amount !== "number" || Number.isNaN(amount))
        return "—";
    return `${normalizeCurrency(currency || "USD") || "USD"} ${amount.toFixed(2)}`;
}
function getLineMode(product, fallbackCurrency) {
    const mode = String(product?.pricingModeDefault ?? "")
        .trim()
        .toLowerCase();
    if (mode === "kg")
        return {
            label: "kg",
            quoteLabel: product?.moqUnit ?? "kg",
            helper: product?.bulkPriceAmount != null
                ? `${formatMoney(product.bulkPriceAmount, product.catalogPriceCurrency || fallbackCurrency)} / kg`
                : "Per kg pricing",
        };
    if (mode === "unit")
        return {
            label: "unit",
            quoteLabel: product?.moqUnit ?? "units",
            helper: "Per unit pricing",
        };
    return {
        label: "case",
        quoteLabel: product?.moqUnit ?? "cases",
        helper: product?.unitsPerCase
            ? `${product.unitsPerCase} units/case`
            : "Per case pricing",
    };
}
function QuoteLineTable({ lineItems, products, currency, pricingBasis, onChangeLine, onRemoveLine, focusLineIndex, focusIssueId, }) {
    return (<div className="overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-white">
      <table className="min-w-[1120px] w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
          <tr>
            <th className="px-3 py-3">Product</th>
            <th className="px-3 py-3">Pack</th>
            <th className="px-3 py-3">MOQ</th>
            <th className="px-3 py-3">Quote qty</th>
            <th className="px-3 py-3">Basis</th>
            <th className="px-3 py-3">Base price</th>
            <th className="px-3 py-3">Quote price</th>
            <th className="px-3 py-3">Line total</th>
            <th className="px-3 py-3">Override reason</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => {
            const product = products.find((entry) => entry.id === item.product_id) ??
                products.find((entry) => entry.defaultVariantId === item.product_variant_id);
            const mode = getLineMode(product, currency);
            const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
            const lineIssues = getPricingLineIssues(item, product);
            const focusedIssue = focusLineIndex === index
                ? (lineIssues.find((issue) => issue.id === focusIssueId) ??
                    null)
                : null;
            return (<tr key={`quote-table-line-${index}`} className={`border-t border-slate-100 align-top ${focusLineIndex === index ? "bg-amber-50/50" : ""}`}>
                <td className="px-3 py-3">
                  <select className={inputClassName()} value={item.product_id} onChange={(event) => onChangeLine(index, hydrateLineFromProduct(item, products.find((product) => product.id === event.target.value), currency, pricingBasis))}>
                    <option value="">Select product</option>
                    {products.map((productOption) => (<option key={productOption.id} value={productOption.id}>
                        {productOption.name}
                      </option>))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    {product?.skuCode
                    ? `SKU ${product.skuCode}`
                    : "Pick a product to load pricing."}
                  </p>
                  {focusedIssue ? (<p className="mt-2 text-xs font-semibold text-amber-800">
                      Current fix target: {focusedIssue.label}
                    </p>) : null}
                  {lineIssues.find((issue) => issue.id === "missing-product") ? (<p className="mt-2 text-xs font-medium text-rose-700">
                      Select a product to unlock catalog-linked pricing.
                    </p>) : null}
                </td>
                <td className="px-3 py-3 text-slate-700">
                  <div className="min-w-[110px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="font-medium text-slate-900">
                      {product?.packLabel ?? product?.defaultVariantName ?? "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {mode.helper}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  <div className="min-w-[90px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="font-medium text-slate-900">
                      {product?.moqDisplay ?? "1"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Default baseline
                    </div>
                  </div>
                  {lineIssues.find((issue) => issue.id === "below-moq") &&
                    typeof product?.moqValue === "number" ? (<button type="button" onClick={() => onChangeLine(index, {
                        ...item,
                        quantity: product?.moqValue ?? item.quantity,
                    })} className="mt-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">
                      Use MOQ
                    </button>) : null}
                </td>
                <td className="px-3 py-3">
                  <input className={inputClassName()} type="number" min="1" value={item.quantity} onChange={(event) => onChangeLine(index, {
                    ...item,
                    quantity: Number(event.target.value) || 0,
                })}/>
                  <p className="mt-1 text-xs text-slate-500">
                    {product?.moqUnit ?? mode.quoteLabel}
                  </p>
                  {lineIssues.find((issue) => issue.id === "missing-quantity") ? (<p className="mt-2 text-xs font-medium text-rose-700">
                      Enter a quantity greater than zero.
                    </p>) : null}
                </td>
                <td className="px-3 py-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900">
                    {pricingBasisLabel(pricingBasis)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {pricingBasis === "cif"
                    ? "FOB base used for CIF uplift"
                    : "Catalog basis linked"}
                  </p>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="font-medium text-slate-900">
                      {formatMoney(item.catalog_price_amount, item.catalog_price_currency || currency)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      per {mode.label}
                    </div>
                  </div>
                  {lineIssues.find((issue) => issue.id === "missing-catalog-baseline") ? (<p className="mt-2 text-xs font-medium text-amber-700">
                      No catalog baseline is linked for this basis yet.
                    </p>) : null}
                </td>
                <td className="px-3 py-3">
                  <input className={inputClassName()} type="number" step="0.01" value={item.unit_price} onChange={(event) => onChangeLine(index, {
                    ...item,
                    unit_price: Number(event.target.value),
                })}/>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatMoney(Number(item.unit_price || 0) -
                    Number(item.catalog_price_amount || 0), item.currency || currency)}{" "}
                    vs base
                  </p>
                  {isLinePriceOverridden(item) &&
                    typeof item.catalog_price_amount === "number" ? (<button type="button" onClick={() => onChangeLine(index, {
                        ...item,
                        unit_price: item.catalog_price_amount ?? item.unit_price,
                        override_reason: "",
                    })} className="mt-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100">
                      Reset to basis price
                    </button>) : null}
                </td>
                <td className="px-3 py-3 text-slate-700">
                  <div className={`rounded-xl border px-3 py-2 ${isLinePriceOverridden(item) ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                    <div className="font-medium text-slate-900">
                      {formatMoney(lineTotal, item.currency || currency)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {isLinePriceOverridden(item)
                    ? "Override active"
                    : "Using base price"}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <input className={inputClassName()} value={item.override_reason} onChange={(event) => onChangeLine(index, {
                    ...item,
                    override_reason: event.target.value,
                })} placeholder={isLinePriceOverridden(item)
                    ? "Why is this price changed?"
                    : "No override reason needed"} disabled={!isLinePriceOverridden(item)}/>
                  {lineIssues.find((issue) => issue.id === "missing-override-reason") ? (<p className="mt-2 text-xs font-medium text-rose-700">
                      Add the commercial reason for this override.
                    </p>) : null}
                  <input className={`${inputClassName()} mt-2`} value={item.notes} onChange={(event) => onChangeLine(index, {
                    ...item,
                    notes: event.target.value,
                })} placeholder="Internal note"/>
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-end gap-2">
                    {lineIssues.length ? (lineIssues.slice(0, 2).map((issue) => (<span key={issue.id} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getPricingIssueBadgeClasses(issue.tone)}`}>
                          {issue.label}
                        </span>))) : (<span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Ready
                      </span>)}
                    <button type="button" onClick={() => onRemoveLine(index)} className="rounded-2xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
                      Remove
                    </button>
                  </div>
                </td>
              </tr>);
        })}
        </tbody>
      </table>
    </div>);
}
function getPricingLineIssues(line, product) {
    const issues = [];
    if (!line.product_id && !line.product_variant_id) {
        issues.push({
            id: "missing-product",
            label: "Select a product",
            detail: "Pick a catalog-linked product before treating the line as commercially valid.",
            tone: "danger",
        });
    }
    if (!(line.quantity > 0)) {
        issues.push({
            id: "missing-quantity",
            label: "Enter quantity",
            detail: "Quantity must be greater than zero before review or send.",
            tone: "danger",
        });
    }
    if (line.product_id && typeof line.catalog_price_amount !== "number") {
        issues.push({
            id: "missing-catalog-baseline",
            label: "Catalog baseline unavailable",
            detail: "This line is missing a linked catalog baseline for the selected pricing basis.",
            tone: "warning",
        });
    }
    if (typeof product?.moqValue === "number" &&
        product.moqValue > 0 &&
        line.quantity > 0 &&
        line.quantity < product.moqValue) {
        issues.push({
            id: "below-moq",
            label: "Below MOQ",
            detail: `Baseline MOQ is ${product.moqDisplay ?? `${product.moqValue} ${product.moqUnit ?? ""}`.trim()}.`,
            tone: "warning",
        });
    }
    if (isLinePriceOverridden(line) && !line.override_reason.trim()) {
        issues.push({
            id: "missing-override-reason",
            label: "Add override reason",
            detail: "Explain why final quote pricing differs from the catalog baseline.",
            tone: "danger",
        });
    }
    return issues;
}
function getPricingIssueBadgeClasses(tone) {
    if (tone === "danger")
        return "border-rose-200 bg-rose-50 text-rose-800";
    if (tone === "warning")
        return "border-amber-200 bg-amber-50 text-amber-800";
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
}
function getPricingStepSummary(lineItems, products) {
    const lineIssueCounts = { danger: 0, warning: 0 };
    const linesNeedingAttention = [];
    lineItems.forEach((line, index) => {
        const product = products.find((entry) => entry.id === line.product_id) ??
            products.find((entry) => entry.defaultVariantId === line.product_variant_id);
        const issues = getPricingLineIssues(line, product);
        if (!issues.length)
            return;
        issues.forEach((issue) => {
            if (issue.tone === "danger" || issue.tone === "warning")
                lineIssueCounts[issue.tone] += 1;
        });
        linesNeedingAttention.push({
            index,
            label: product?.name ?? `Line ${index + 1}`,
            issues,
        });
    });
    return {
        lineIssueCounts,
        linesNeedingAttention,
        totalLines: lineItems.length,
        healthyLines: Math.max(lineItems.length - linesNeedingAttention.length, 0),
    };
}
function getStepRecommendations(data) {
    const recommendations = new Map();
    if (!normalizeCurrency(data.currency)) {
        recommendations.set("product", {
            stepId: "product",
            label: "Confirm product context",
            detail: "Set a valid 3-letter quote currency before moving to final review or send.",
            tone: "danger",
            recommendationKey: "currency-invalid",
            targetLabel: "Currency",
            fieldId: "currency",
        });
    }
    const pricingSummary = getPricingStepSummary(data.lineItems, data.products);
    if (!pricingSummary.totalLines) {
        recommendations.set("pricing", {
            stepId: "pricing",
            label: "Add pricing lines",
            detail: "Add at least one commercially usable line before review or send.",
            tone: "danger",
            recommendationKey: "pricing-empty",
            targetLabel: "Add first pricing line",
            fieldId: "line_items",
        });
    }
    else if (pricingSummary.linesNeedingAttention.length) {
        const firstLine = pricingSummary.linesNeedingAttention[0];
        const topIssue = firstLine.issues[0];
        recommendations.set("pricing", {
            stepId: "pricing",
            label: "Resolve pricing line issues",
            detail: `${firstLine.label}: ${topIssue.detail}`,
            tone: firstLine.issues.some((issue) => issue.tone === "danger")
                ? "danger"
                : "warning",
            recommendationKey: "pricing-line-issue",
            targetLabel: `${firstLine.label} · line ${firstLine.index + 1}`,
            fieldId: "line_items",
            lineIndex: firstLine.index,
            issueId: topIssue.id,
        });
    }
    if (!QUOTE_STATUSES.includes(data.status)) {
        recommendations.set("terms", {
            stepId: "terms",
            label: "Confirm workflow posture",
            detail: "Choose a valid quote workflow status before save or send.",
            tone: "danger",
            recommendationKey: "status-invalid",
            targetLabel: "Workflow status",
            fieldId: "workflow_status",
        });
    }
    else if (data.approvalRequired && data.approvalState === "pending") {
        recommendations.set("terms", {
            stepId: "terms",
            label: "Review approval posture",
            detail: "Approval is still pending. Confirm whether the quote should stay pending or move to approved before send.",
            tone: data.status === "sent" ? "danger" : "warning",
            recommendationKey: "approval-pending",
            targetLabel: "Approval state",
            fieldId: "approval_state",
        });
    }
    else if (data.approvalRequired &&
        !APPROVAL_STATES.includes(data.approvalState)) {
        recommendations.set("terms", {
            stepId: "terms",
            label: "Fix approval state",
            detail: "Pick a valid approval state while approval is required.",
            tone: "danger",
            recommendationKey: "approval-invalid",
            targetLabel: "Approval state",
            fieldId: "approval_state",
        });
    }
    if ((data.quoteSendGuard?.blockerCount ?? 0) > 0) {
        recommendations.set("send", {
            stepId: "send",
            label: "Clear send checkpoint blockers",
            detail: data.quoteSendGuard?.blockerReasons[0] ??
                "Resolve the current send blocker before marking the quote as sent.",
            tone: "danger",
            recommendationKey: "send-blockers",
            targetLabel: "Send checkpoint blockers",
            fieldId: "send_checkpoint",
        });
    }
    return Array.from(recommendations.values());
}
function getRecommendationPriority(recommendation) {
    if (recommendation.recommendationKey === "send-blockers")
        return 0;
    if (recommendation.recommendationKey === "pricing-empty")
        return 1;
    if (recommendation.recommendationKey === "currency-invalid")
        return 2;
    if (recommendation.recommendationKey === "status-invalid")
        return 3;
    if (recommendation.recommendationKey === "approval-invalid")
        return 4;
    if (recommendation.recommendationKey === "pricing-line-issue")
        return 5;
    if (recommendation.recommendationKey === "approval-pending")
        return 6;
    return 10;
}
function getSortedRecommendations(recommendations) {
    return [...recommendations].sort((left, right) => {
        const toneDelta = (left.tone === "danger" ? 0 : left.tone === "warning" ? 1 : 2) -
            (right.tone === "danger" ? 0 : right.tone === "warning" ? 1 : 2);
        if (toneDelta !== 0)
            return toneDelta;
        return getRecommendationPriority(left) - getRecommendationPriority(right);
    });
}
function getCheckpointReadiness(mode, recommendations) {
    const orderedRecommendations = getSortedRecommendations(recommendations);
    const blockerRecommendations = orderedRecommendations.filter((recommendation) => recommendation.tone === "danger");
    const warningRecommendations = orderedRecommendations.filter((recommendation) => recommendation.tone === "warning");
    const primaryRecommendation = orderedRecommendations[0] ?? null;
    if (blockerRecommendations.length) {
        return {
            tone: "danger",
            title: mode === "review"
                ? "Save is blocked until required fixes are cleared"
                : "Send is blocked until required fixes are cleared",
            detail: primaryRecommendation?.detail ??
                "Clear the highest-priority blocker before moving forward.",
            blockerRecommendations,
            warningRecommendations,
            primaryRecommendation,
        };
    }
    if (warningRecommendations.length) {
        return {
            tone: "warning",
            title: mode === "review"
                ? "Save can continue, but important checks still need confirmation"
                : "Send can continue, but important checks still need confirmation",
            detail: primaryRecommendation?.detail ??
                "Review the active caution before moving forward.",
            blockerRecommendations,
            warningRecommendations,
            primaryRecommendation,
        };
    }
    return {
        tone: "good",
        title: mode === "review"
            ? "Save checkpoint currently looks clear"
            : "Send checkpoint currently looks clear",
        detail: mode === "review"
            ? "No guided blockers or caution flags are currently active for this save checkpoint."
            : "No guided blockers or caution flags are currently active for this send checkpoint.",
        blockerRecommendations,
        warningRecommendations,
        primaryRecommendation,
    };
}
function CheckpointReadinessPanel({ recommendations, onJump, mode, }) {
    const readiness = getCheckpointReadiness(mode, recommendations);
    const ctaLabel = readiness.primaryRecommendation?.stepId === "send" && mode === "send"
        ? "Show blocker detail"
        : readiness.primaryRecommendation
            ? `Open ${QUOTE_CREATE_STEPS.find((step) => step.id === readiness.primaryRecommendation?.stepId)?.shortLabel ?? readiness.primaryRecommendation.stepId}${readiness.primaryRecommendation.targetLabel ? ` · ${readiness.primaryRecommendation.targetLabel}` : ""}`
            : null;
    return (<SectionCard className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Checkpoint readiness
          </p>
          <p className="mt-1 text-sm text-slate-600">{readiness.title}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRiskFlagClasses(readiness.tone)}`}>
          {readiness.blockerRecommendations.length
            ? `${readiness.blockerRecommendations.length} blocker${readiness.blockerRecommendations.length === 1 ? "" : "s"}`
            : readiness.warningRecommendations.length
                ? `${readiness.warningRecommendations.length} caution${readiness.warningRecommendations.length === 1 ? "" : "s"}`
                : "Ready"}
        </span>
      </div>
      <div className={`mt-4 rounded-2xl border px-4 py-4 ${getRiskFlagClasses(readiness.tone)}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em]">
          {readiness.blockerRecommendations.length
            ? "Primary blocker"
            : readiness.warningRecommendations.length
                ? "Primary caution"
                : "Primary signal"}
        </p>
        {readiness.primaryRecommendation?.targetLabel ? (<p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
            {readiness.primaryRecommendation.targetLabel}
          </p>) : null}
        <p className="mt-2 text-sm leading-6">{readiness.detail}</p>
        {readiness.primaryRecommendation && ctaLabel ? (<button type="button" onClick={() => onJump(readiness.primaryRecommendation, mode)} className="mt-3 rounded-full border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white">
            {ctaLabel}
          </button>) : null}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            Must fix now
          </p>
          {readiness.blockerRecommendations.length ? (<ul className="mt-3 space-y-2">
              {readiness.blockerRecommendations.map((recommendation) => (<li key={`blocker-${mode}-${recommendation.stepId}`}>
                  <span className="font-semibold text-slate-900">
                    {recommendation.label}
                  </span>
                  <span className="block leading-6">{recommendation.detail}</span>
                </li>))}
            </ul>) : (<p className="mt-3 text-emerald-700">
              No blocking issues are currently active for this checkpoint.
            </p>)}
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]">
            Should confirm
          </p>
          {readiness.warningRecommendations.length ? (<ul className="mt-3 space-y-2">
              {readiness.warningRecommendations.map((recommendation) => (<li key={`warning-${mode}-${recommendation.stepId}`}>
                  <span className="font-semibold text-slate-900">
                    {recommendation.label}
                  </span>
                  <span className="block leading-6">{recommendation.detail}</span>
                </li>))}
            </ul>) : (<p className="mt-3 text-slate-600">
              No caution-level checks are currently waiting for confirmation.
            </p>)}
        </div>
      </div>
    </SectionCard>);
}
function StepRemediationPanel({ recommendations, onJump, mode, }) {
    const orderedRecommendations = getSortedRecommendations(recommendations);
    const title = mode === "review" ? "All guided actions" : "All guided actions";
    const description = mode === "review"
        ? "Use these step-aware actions to move straight back to the part of the builder that needs attention, in priority order."
        : "The send checkpoint should point back to the exact builder step that still needs work, in priority order.";
    return (<SectionCard className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${orderedRecommendations.length ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {orderedRecommendations.length
            ? `${orderedRecommendations.length} guided ${orderedRecommendations.length === 1 ? "fix" : "fixes"}`
            : "No remediation needed"}
        </span>
      </div>
      {orderedRecommendations.length ? (<div className="mt-4 grid gap-3 lg:grid-cols-2">
          {orderedRecommendations.map((recommendation) => (<div key={`${mode}-${recommendation.stepId}`} className={`rounded-2xl border px-4 py-4 ${getRiskFlagClasses(recommendation.tone)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                {recommendation.tone === "danger"
                    ? "Required now"
                    : recommendation.tone === "warning"
                        ? "Confirm soon"
                        : "Info"}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {recommendation.label}
              </p>
              {recommendation.targetLabel ? (<p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                  {recommendation.targetLabel}
                </p>) : null}
              <p className="mt-2 text-sm leading-6">{recommendation.detail}</p>
              <button type="button" onClick={() => onJump(recommendation, mode)} className="mt-3 rounded-full border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white">
                {recommendation.stepId === "send" && mode === "send"
                    ? "Show blocker detail"
                    : `Go to ${QUOTE_CREATE_STEPS.find((step) => step.id === recommendation.stepId)?.shortLabel ?? recommendation.stepId}${recommendation.targetLabel ? ` · ${recommendation.targetLabel}` : ""}`}
              </button>
            </div>))}
        </div>) : (<p className="mt-4 text-sm text-emerald-700">
          Everything surfaced so far is already aligned for this checkpoint.
        </p>)}
    </SectionCard>);
}
function buildRemediationTarget(recommendation, sourceStepId) {
    return {
        stepId: recommendation.stepId,
        detail: recommendation.detail,
        targetLabel: recommendation.targetLabel ??
            QUOTE_CREATE_STEPS.find((step) => step.id === recommendation.stepId)
                ?.shortLabel ??
            recommendation.stepId,
        recommendationKey: recommendation.recommendationKey,
        fieldId: recommendation.fieldId,
        lineIndex: recommendation.lineIndex,
        issueId: recommendation.issueId,
        sourceStepId,
    };
}
function isRemediationTargetResolved(target, data) {
    if (target.recommendationKey === "currency-invalid")
        return Boolean(normalizeCurrency(data.currency));
    if (target.recommendationKey === "pricing-empty")
        return data.lineItems.length > 0;
    if (target.recommendationKey === "pricing-line-issue") {
        const line = typeof target.lineIndex === "number"
            ? data.lineItems[target.lineIndex]
            : null;
        if (!line)
            return true;
        const product = data.products.find((entry) => entry.id === line.product_id) ??
            data.products.find((entry) => entry.defaultVariantId === line.product_variant_id);
        const issues = getPricingLineIssues(line, product);
        return target.issueId
            ? !issues.some((issue) => issue.id === target.issueId)
            : !issues.length;
    }
    if (target.recommendationKey === "status-invalid") {
        return QUOTE_STATUSES.includes(data.status);
    }
    if (target.recommendationKey === "approval-pending") {
        return !data.approvalRequired || data.approvalState !== "pending";
    }
    if (target.recommendationKey === "approval-invalid") {
        return (!data.approvalRequired ||
            APPROVAL_STATES.includes(data.approvalState));
    }
    if (target.recommendationKey === "send-blockers") {
        return (data.quoteSendGuard?.blockerCount ?? 0) === 0;
    }
    return false;
}
function RemediationFocusPanel({ target, onClear, }) {
    if (!target)
        return null;
    return (<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Current fix target</p>
          {target.sourceStepId ? (<p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Opened from {target.sourceStepId}
            </p>) : null}
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            {target.targetLabel}
          </p>
          <p className="mt-2 leading-6">{target.detail}</p>
        </div>
        <button type="button" onClick={onClear} className="rounded-full border border-amber-300 bg-white/80 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-white">
          Clear focus
        </button>
      </div>
    </div>);
}
function RemediationReturnPanel({ target, isResolved, onReturn, onClear, }) {
    if (!target?.sourceStepId)
        return null;
    const sourceLabel = QUOTE_CREATE_STEPS.find((step) => step.id === target.sourceStepId)
        ?.shortLabel ?? target.sourceStepId;
    return (<div className={`rounded-2xl border p-4 text-sm ${isResolved ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Return path</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Back to {sourceLabel}
          </p>
          <p className="mt-2 leading-6">
            {isResolved
            ? `This exact fix target now looks clear. Return to ${sourceLabel} inside the same builder to confirm the checkpoint.`
            : `Keep working on this exact target, or return to ${sourceLabel} if you need to re-check the broader checkpoint first.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onReturn} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50">
            Return to {sourceLabel}
          </button>
          <button type="button" onClick={onClear} className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white/80">
            Clear loop
          </button>
        </div>
      </div>
    </div>);
}
function RemediationCheckpointPanel({ target, isResolved, onReopen, onClear, }) {
    if (!target?.sourceStepId)
        return null;
    const sourceLabel = QUOTE_CREATE_STEPS.find((step) => step.id === target.sourceStepId)
        ?.shortLabel ?? target.sourceStepId;
    const targetStepLabel = QUOTE_CREATE_STEPS.find((step) => step.id === target.stepId)?.shortLabel ??
        target.stepId;
    return (<div className={`rounded-2xl border p-4 text-sm ${isResolved ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">
            {sourceLabel} checkpoint loop
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Exact target · {targetStepLabel} · {target.targetLabel}
          </p>
          <p className="mt-2 leading-6">
            {isResolved
            ? `You are back on ${sourceLabel}. The exact fix target now looks clear, so this checkpoint can be confirmed here or reopened if you want to verify the field again.`
            : `You are back on ${sourceLabel}, but the exact fix target still needs work. Reopen ${target.targetLabel} before confirming this checkpoint.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onReopen} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-50">
            Reopen {targetStepLabel}
          </button>
          <button type="button" onClick={onClear} className="rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white/80">
            Clear loop
          </button>
        </div>
      </div>
    </div>);
}
function getFieldFocusClasses(isFocused) {
    return isFocused
        ? "rounded-[1.25rem] border border-amber-200 bg-amber-50/60 p-3"
        : "";
}
function PricingReadinessPanel({ lineItems, products, }) {
    const summary = getPricingStepSummary(lineItems, products);
    return (<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">Pricing readiness</p>
          <p className="mt-1 text-xs text-slate-500">
            Make line-level issues explicit here before they become review or
            send blockers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {summary.totalLines} total
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {summary.healthyLines} clear
          </span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {summary.lineIssueCounts.warning} warnings
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            {summary.lineIssueCounts.danger} blockers
          </span>
        </div>
      </div>
      {summary.linesNeedingAttention.length ? (<div className="mt-4 grid gap-3 lg:grid-cols-2">
          {summary.linesNeedingAttention.slice(0, 4).map((line) => (<div key={`${line.label}-${line.index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
              <p className="font-medium text-slate-900">{line.label}</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
                {line.issues.map((issue) => (<li key={issue.id}>
                    •{" "}
                    <span className="font-medium text-slate-800">
                      {issue.label}:
                    </span>{" "}
                    {issue.detail}
                  </li>))}
              </ul>
            </div>))}
        </div>) : (<p className="mt-3 text-emerald-700">
          Every visible line is currently ready for review inside the pricing
          step.
        </p>)}
    </div>);
}
function applyPricingBasisToLine(line, products, currency, pricingBasis) {
    const matchedProduct = products.find((product) => product.id === line.product_id) ??
        products.find((product) => product.defaultVariantId === line.product_variant_id);
    const nextCatalogAmount = getProductBasisAmount(matchedProduct, pricingBasis);
    const previousCatalogAmount = typeof line.catalog_price_amount === "number"
        ? line.catalog_price_amount
        : null;
    const shouldFollowCatalog = previousCatalogAmount == null ||
        Number(line.unit_price) === Number(previousCatalogAmount);
    const nextCurrency = normalizeCurrency(line.catalog_price_currency ||
        matchedProduct?.catalogPriceCurrency ||
        line.currency ||
        currency) || "USD";
    return {
        ...line,
        catalog_price_amount: typeof nextCatalogAmount === "number" ? nextCatalogAmount : null,
        catalog_price_currency: nextCurrency,
        unit_price: shouldFollowCatalog
            ? typeof nextCatalogAmount === "number"
                ? nextCatalogAmount
                : 0
            : line.unit_price,
        currency: normalizeCurrency(line.currency || nextCurrency || currency) || "USD",
    };
}
function mapTemplateLinesToDraftLines(templateId, currency, pricingBasis = "fob") {
    const template = getPricingTemplate(templateId);
    if (!template)
        return [buildLineFromProduct(undefined, currency, pricingBasis)];
    return applyPricingTemplate(template, currency).map((line) => ({
        product_id: line.product_id,
        product_variant_id: "",
        catalog_price_id: "",
        catalog_price_amount: null,
        catalog_price_currency: normalizeCurrency(line.currency || currency) || "USD",
        quantity: line.quantity,
        unit_price: line.unit_price,
        currency: normalizeCurrency(line.currency || currency) || "USD",
        override_reason: "",
        notes: line.notes,
    }));
}
function getQuoteRiskFlags({ lineItems, approvalRequired, approvalState, status, products, quoteSendGuard, }) {
    const usableLines = lineItems.filter((item) => item.quantity > 0 && (item.product_id || item.notes.trim()));
    const overrideLines = usableLines.filter((item) => isLinePriceOverridden(item));
    const missingOverrideReasons = overrideLines.filter((item) => !item.override_reason.trim());
    const moqRiskLines = usableLines.filter((item) => {
        const product = products.find((entry) => entry.id === item.product_id) ??
            products.find((entry) => entry.defaultVariantId === item.product_variant_id);
        return (typeof product?.moqValue === "number" &&
            product.moqValue > 0 &&
            item.quantity < product.moqValue);
    });
    const draftValue = usableLines.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
    const catalogValue = usableLines.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.catalog_price_amount || 0), 0);
    const priceDrift = draftValue - catalogValue;
    const approvalPending = approvalRequired && approvalState === "pending";
    const sendBlocked = (quoteSendGuard?.blockerCount ?? 0) > 0;
    const flags = [];
    if (!usableLines.length) {
        flags.push({
            id: "draft-lines-missing",
            label: "Draft still missing priced lines",
            detail: "Add at least one usable line before review or send.",
            tone: "danger",
        });
    }
    else {
        flags.push({
            id: "pricing-delta",
            label: priceDrift === 0
                ? "Draft matches catalog baseline"
                : priceDrift > 0
                    ? "Draft prices above catalog baseline"
                    : "Draft prices below catalog baseline",
            detail: `${formatMoney(Math.abs(priceDrift), usableLines[0]?.currency)} ${priceDrift === 0 ? "difference is currently zero." : priceDrift > 0 ? "higher than catalog across current lines." : "below catalog across current lines."}`,
            tone: priceDrift === 0 ? "good" : priceDrift > 0 ? "warning" : "danger",
        });
    }
    if (overrideLines.length) {
        flags.push({
            id: "overrides",
            label: `${overrideLines.length} line ${overrideLines.length === 1 ? "override" : "overrides"} active`,
            detail: missingOverrideReasons.length
                ? `${missingOverrideReasons.length} override ${missingOverrideReasons.length === 1 ? "reason is" : "reasons are"} still missing.`
                : "Every override currently has an explanation.",
            tone: missingOverrideReasons.length ? "danger" : "warning",
        });
    }
    else if (usableLines.length) {
        flags.push({
            id: "overrides-clear",
            label: "No manual price overrides",
            detail: "All current lines are still following the linked catalog baseline.",
            tone: "good",
        });
    }
    if (moqRiskLines.length) {
        flags.push({
            id: "moq-risk",
            label: `${moqRiskLines.length} line ${moqRiskLines.length === 1 ? "sits" : "sit"} below MOQ`,
            detail: "Raise quantity or confirm the exception before the quote moves forward.",
            tone: "warning",
        });
    }
    if (approvalPending) {
        flags.push({
            id: "approval-pending",
            label: "Approval is still pending",
            detail: "Keep the send checkpoint explicit until approval is resolved.",
            tone: status === "sent" ? "danger" : "warning",
        });
    }
    else if (!approvalRequired) {
        flags.push({
            id: "approval-not-required",
            label: "Approval is not required",
            detail: "This draft can move based on quote quality and send blockers alone.",
            tone: "good",
        });
    }
    if (sendBlocked) {
        flags.push({
            id: "send-blockers",
            label: `${quoteSendGuard?.blockerCount ?? 0} send ${quoteSendGuard?.blockerCount === 1 ? "blocker" : "blockers"} open`,
            detail: quoteSendGuard?.blockerReasons[0] ??
                "Resolve the current blocker before send.",
            tone: "danger",
        });
    }
    else {
        flags.push({
            id: "send-clear",
            label: "No send blockers flagged",
            detail: "The quote guard is currently clear for send readiness.",
            tone: "good",
        });
    }
    return flags;
}
function getRiskFlagClasses(tone) {
    if (tone === "danger")
        return "border-rose-200 bg-rose-50 text-rose-900";
    if (tone === "warning")
        return "border-amber-200 bg-amber-50 text-amber-900";
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
}
function getVersionStatusLabel(version) {
    return String(version?.status ?? "draft").replaceAll("_", " ");
}
function getQuoteVersionCheckpoint(quote, quoteVersions) {
    const scopedVersions = [...quoteVersions]
        .filter((version) => version.quote_id === quote.id)
        .sort((left, right) => Number(right.version_no ?? 0) - Number(left.version_no ?? 0) ||
        String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")));
    const currentVersion = scopedVersions.find((version) => version.id === quote.current_version_id) ??
        scopedVersions[0] ??
        null;
    const sentVersion = scopedVersions.find((version) => version.sent_at ||
        String(version.status ?? "").toLowerCase() === "sent") ?? null;
    const approvedVersion = scopedVersions.find((version) => version.approved_at ||
        String(version.status ?? "").toLowerCase() === "approved") ?? null;
    return {
        scopedVersions,
        currentVersion,
        sentVersion,
        approvedVersion,
    };
}
function QuoteVersionCheckpointPanel({ quote, quoteVersions, mode, }) {
    const { scopedVersions, currentVersion, sentVersion, approvedVersion } = getQuoteVersionCheckpoint(quote, quoteVersions);
    const title = mode === "review" ? "Version continuity" : "Checkpoint history";
    const description = mode === "review"
        ? "Keep the latest synced version visible while saving guided edits back into the same quote."
        : "Keep current, sent, and approved checkpoints visible before changing send posture.";
    return (<div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-2">{description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Current version
          </p>
          <p className="mt-2 font-semibold text-slate-900">
            {currentVersion?.version_no
            ? `v${currentVersion.version_no}`
            : "Pending sync"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {currentVersion
            ? `Created ${formatDateTime(currentVersion.created_at)}`
            : "No synced version is linked to this draft yet."}
          </p>
        </div>
        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Latest sent
          </p>
          <p className="mt-2 font-semibold text-slate-900">
            {sentVersion?.version_no
            ? `v${sentVersion.version_no}`
            : "Not sent yet"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {sentVersion?.sent_at
            ? `Sent ${formatDateTime(sentVersion.sent_at)}`
            : "A synced send checkpoint will appear here once a version is sent."}
          </p>
        </div>
        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Approval checkpoint
          </p>
          <p className="mt-2 font-semibold text-slate-900">
            {approvedVersion?.version_no
            ? `v${approvedVersion.version_no}`
            : "No approved version yet"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {approvedVersion?.approved_at
            ? `Approved ${formatDateTime(approvedVersion.approved_at)}`
            : "Approval timing appears here once a synced version is approved."}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Recent version trail
        </p>
        <div className="mt-3 space-y-2">
          {scopedVersions.length ? (scopedVersions.slice(0, 3).map((version) => (<div key={version.id} className="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    v{version.version_no ?? "—"} ·{" "}
                    {getVersionStatusLabel(version)}
                  </p>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(version.sent_at ??
                version.approved_at ??
                version.created_at)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  <span>
                    {version.approved_at ? "Approved" : "Awaiting approval"}
                  </span>
                  <span>{version.sent_at ? "Sent" : "Not sent"}</span>
                  <span>
                    {version.id === currentVersion?.id
                ? "Current version"
                : "Prior version"}
                  </span>
                </div>
              </div>))) : (<div className="rounded-[1rem] border border-dashed border-slate-300 bg-white px-3 py-3 text-sm text-slate-500">
              No synced version history is available for this quote yet.
            </div>)}
        </div>
      </div>
    </div>);
}
function getQuoteValidation(stepId, data) {
    const issues = [];
    if (stepId === "product") {
        if (!normalizeCurrency(data.currency))
            issues.push("Choose a 3-letter currency code such as USD or EUR.");
    }
    if (stepId === "pricing" || stepId === "review" || stepId === "send") {
        const usable = data.lineItems.filter((item) => item.quantity > 0 && (item.product_id || item.notes.trim()));
        if (!usable.length)
            issues.push("Add at least one priced line item before continuing.");
        if (data.lineItems.some((item) => item.quantity <= 0))
            issues.push("Quote quantities must stay above zero.");
        if (data.lineItems.some((item) => item.unit_price < 0))
            issues.push("Unit pricing cannot be negative.");
        if (data.lineItems.some((item) => isLinePriceOverridden(item) && !item.override_reason.trim()))
            issues.push("Add an override reason whenever final quote pricing differs from the catalog baseline.");
    }
    if (stepId === "terms" || stepId === "review" || stepId === "send") {
        if (data.approvalRequired &&
            !APPROVAL_STATES.includes(data.approvalState)) {
            issues.push("Pick a valid approval state when approval is required.");
        }
        if (!QUOTE_STATUSES.includes(data.status))
            issues.push("Pick a valid quote workflow state.");
    }
    if (stepId === "send") {
        if (data.status === "sent" &&
            data.approvalRequired &&
            data.approvalState === "pending")
            issues.push("Resolve approval before marking the quote as sent.");
        if (data.status === "sent" && (data.quoteSendGuard?.blockerCount ?? 0) > 0)
            issues.push("Resolve quote-send blockers before submitting this quote.");
    }
    return issues;
}
function QuoteReviewPanel({ currency, status, approvalRequired, approvalState, lineItems, templateId, products, quoteSendGuard, }) {
    const totals = computeQuoteTotals(lineItems, normalizeCurrency(currency));
    const template = getPricingTemplate(templateId);
    const riskFlags = getQuoteRiskFlags({
        lineItems,
        approvalRequired,
        approvalState,
        status,
        products,
        quoteSendGuard,
    });
    return (<div className="space-y-4">
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getQuoteStatusBadgeClasses(status)}`}>
            {status.replaceAll("_", " ")}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApprovalBadgeClasses((approvalRequired ? approvalState : "not_required"))}`}>
            approval{" "}
            {(approvalRequired ? approvalState : "not_required").replaceAll("_", " ")}
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Subtotal
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {totals.currency} {totals.subtotal.toFixed(2)}
            </p>
          </div>
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Line items
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {totals.lineItemCount}
            </p>
          </div>
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Currency
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {normalizeCurrency(currency) || "Unset"}
            </p>
          </div>
          <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Template
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {template?.name ?? "Manual pricing"}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft text-sm text-slate-600">
        <p className="font-medium text-slate-900">Commercial framing</p>
        <ul className="mt-3 space-y-2">
          <li>
            Pricing linkage remains inside the current quote + quote line item
            model.
          </li>
          <li>
            Approval state and workflow status stay visible before send or
            revision decisions.
          </li>
          <li>
            Validation follows the same step-aware pattern used in the lead and
            RFQ wizards.
          </li>
        </ul>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Pricing and risk cues
          </p>
          <div className="mt-3 grid gap-3">
            {riskFlags.map((flag) => (<div key={flag.id} className={`rounded-2xl border px-4 py-3 ${getRiskFlagClasses(flag.tone)}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                  {flag.label}
                </p>
                <p className="mt-1 text-xs leading-5">{flag.detail}</p>
              </div>))}
          </div>
        </div>
      </div>
    </div>);
}
export function QuoteCreateWizardForm({ leadId, rfqs, products, quoteSendGuard, onClose, onSaved, }) {
    const [state, formAction] = useFormState(createQuote, {});
    const defaultTemplate = PRICING_TEMPLATES[0];
    const [activeStepId, setActiveStepId] = useState("product");
    const [validationIssues, setValidationIssues] = useState([]);
    const [remediationTarget, setRemediationTarget] = useState(null);
    const [rfqId, setRfqId] = useState("");
    const [templateId, setTemplateId] = useState(defaultTemplate?.id ?? "");
    const [currency, setCurrency] = useState(defaultTemplate?.currency ?? "USD");
    const [approvalRequired, setApprovalRequired] = useState(true);
    const [approvalState, setApprovalState] = useState("pending");
    const [status, setStatus] = useState("draft");
    const [notes, setNotes] = useState("");
    const [pricingBasis, setPricingBasis] = useState("fob");
    const [lineItems, setLineItems] = useState([
        buildLineFromProduct(products[0], defaultTemplate?.currency ?? "USD", "fob"),
    ]);
    useEffect(() => {
        if (state.success)
            setValidationIssues([]);
        if (state.success && state.record) {
            onSaved?.(state.record);
            onClose();
        }
    }, [onClose, onSaved, state.record, state.success]);
    const activeIndex = QUOTE_CREATE_STEPS.findIndex((step) => step.id === activeStepId);
    const currentStep = QUOTE_CREATE_STEPS[activeIndex] ?? QUOTE_CREATE_STEPS[0];
    const currentIssues = getQuoteValidation(activeStepId, {
        currency,
        approvalRequired,
        approvalState,
        status,
        lineItems,
        quoteSendGuard,
    });
    const reviewIssues = getQuoteValidation("review", {
        currency,
        approvalRequired,
        approvalState,
        status,
        lineItems,
        quoteSendGuard,
    });
    const hasReviewBlockingIssues = reviewIssues.length > 0;
    const stepRecommendations = getStepRecommendations({
        currency,
        approvalRequired,
        approvalState,
        status,
        lineItems,
        products,
        quoteSendGuard,
    });
    const activeRemediationTarget = remediationTarget?.stepId === activeStepId ? remediationTarget : null;
    const activeRemediationLoopTarget = activeRemediationTarget?.sourceStepId
        ? activeRemediationTarget
        : null;
    const checkpointRemediationTarget = remediationTarget?.sourceStepId === activeStepId ? remediationTarget : null;
    const remediationLoopResolved = activeRemediationLoopTarget
        ? isRemediationTargetResolved(activeRemediationLoopTarget, {
            currency,
            approvalRequired,
            approvalState,
            status,
            lineItems,
            products,
            quoteSendGuard,
        })
        : false;
    const checkpointRemediationResolved = checkpointRemediationTarget
        ? isRemediationTargetResolved(checkpointRemediationTarget, {
            currency,
            approvalRequired,
            approvalState,
            status,
            lineItems,
            products,
            quoteSendGuard,
        })
        : false;
    const applyRemediationJump = (recommendation, sourceStepId) => {
        setValidationIssues([]);
        setActiveStepId(recommendation.stepId);
        setRemediationTarget(buildRemediationTarget(recommendation, sourceStepId));
    };
    const returnToRemediationSource = () => {
        if (!activeRemediationLoopTarget?.sourceStepId)
            return;
        setValidationIssues([]);
        setActiveStepId(activeRemediationLoopTarget.sourceStepId);
    };
    const reopenRemediationTarget = () => {
        if (!checkpointRemediationTarget)
            return;
        setValidationIssues([]);
        setActiveStepId(checkpointRemediationTarget.stepId);
    };
    const goNext = () => {
        const issues = getQuoteValidation(activeStepId, {
            currency,
            approvalRequired,
            approvalState,
            status,
            lineItems,
        });
        setValidationIssues(issues);
        if (issues.length)
            return;
        setRemediationTarget(null);
        setActiveStepId(QUOTE_CREATE_STEPS[Math.min(activeIndex + 1, QUOTE_CREATE_STEPS.length - 1)]?.id);
    };
    return (<form action={formAction} className="space-y-5">
      <input type="hidden" name="lead_id" value={leadId}/>
      <input type="hidden" name="rfq_id" value={rfqId}/>
      <input type="hidden" name="template_id" value={templateId}/>
      <input type="hidden" name="currency" value={normalizeCurrency(currency)}/>
      <input type="hidden" name="approval_required" value={approvalRequired ? "true" : "false"}/>
      <input type="hidden" name="approval_state" value={approvalRequired ? approvalState : "not_required"}/>
      <input type="hidden" name="status" value={status}/>
      <input type="hidden" name="notes" value={notes}/>
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems.map((item) => ({
            ...item,
            currency: normalizeCurrency(item.currency || currency),
            catalog_price_currency: normalizeCurrency(item.catalog_price_currency || item.currency || currency),
            is_price_overridden: isLinePriceOverridden(item),
        })))} readOnly/>
      <input type="hidden" name="pricing_basis" value={pricingBasis} readOnly/>

      <WizardShell steps={QUOTE_CREATE_STEPS} activeStepId={activeStepId} onStepChange={(nextStep) => {
            const issues = getQuoteValidation(activeStepId, {
                currency,
                approvalRequired,
                approvalState,
                status,
                lineItems,
                quoteSendGuard,
            });
            if (QUOTE_CREATE_STEPS.findIndex((step) => step.id === nextStep) >
                activeIndex &&
                issues.length) {
                setValidationIssues(issues);
                return;
            }
            setValidationIssues([]);
            setRemediationTarget((current) => current &&
                (current.stepId === nextStep || current.sourceStepId === nextStep)
                ? current
                : null);
            setActiveStepId(nextStep);
        }} summary={<WizardValidationSummary title="Resolve before continuing" issues={validationIssues.length ? validationIssues : currentIssues} tone="info"/>}>
        {activeStepId === "product" ? (<WizardStepBody title="Product context" description="Anchor the draft to RFQ linkage, template, basis, and currency before pricing and terms are edited." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <SectionCard className="p-4 sm:p-5">
              <div className="space-y-4">
                <RemediationFocusPanel target={activeRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <RemediationReturnPanel target={activeRemediationLoopTarget} isResolved={remediationLoopResolved} onReturn={returnToRemediationSource} onClear={() => setRemediationTarget(null)}/>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "rfq_id")}>
                    <FilterField label="Linked RFQ">
                      <select className={inputClassName()} value={rfqId} onChange={(event) => {
                const nextRfqId = event.target.value;
                setRfqId(nextRfqId);
                const linked = rfqs.find((rfq) => rfq.id === nextRfqId);
                if (linked?.currency)
                    setCurrency(normalizeCurrency(linked.currency));
            }}>
                        <option value="">None</option>
                        {rfqs.map((rfq) => (<option key={rfq.id} value={rfq.id}>
                            {rfq.id.slice(0, 8)} ·{" "}
                            {rfq.status.replaceAll("_", " ")}
                          </option>))}
                      </select>
                    </FilterField>
                  </div>
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "template_id")}>
                    <FilterField label="Pricing template">
                      <select className={inputClassName()} value={templateId} onChange={(event) => {
                const nextId = event.target.value;
                const template = getPricingTemplate(nextId);
                setTemplateId(nextId);
                if (template) {
                    setCurrency(template.currency);
                    setLineItems(mapTemplateLinesToDraftLines(nextId, template.currency, pricingBasis));
                }
            }}>
                        {PRICING_TEMPLATES.map((template) => (<option key={template.id} value={template.id}>
                            {template.name}
                          </option>))}
                      </select>
                    </FilterField>
                  </div>
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "pricing_basis")}>
                    <FilterField label="Pricing basis">
                      <select className={inputClassName()} value={pricingBasis} onChange={(event) => {
                const nextBasis = normalizePricingBasis(event.target.value);
                setPricingBasis(nextBasis);
                setLineItems((current) => current.map((line) => applyPricingBasisToLine(line, products, currency, nextBasis)));
            }}>
                        {["ex_factory", "fob", "cif"].map((basis) => (<option key={basis} value={basis}>
                            {pricingBasisLabel(normalizePricingBasis(basis))}
                          </option>))}
                      </select>
                    </FilterField>
                  </div>
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "currency")}>
                    <FilterField label="Currency">
                      <input className={inputClassName()} value={currency} onChange={(event) => setCurrency(normalizeCurrency(event.target.value))} maxLength={3}/>
                    </FilterField>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">
                  Why Product comes first
                </p>
                <ul className="mt-3 space-y-2">
                  <li>
                    • Lock the quote to the right buyer and optional RFQ context
                    before pricing changes begin.
                  </li>
                  <li>
                    • Keep pricing basis and currency visible early so later
                    line edits stay consistent.
                  </li>
                  <li>
                    • Preserve the lead-owned launch path instead of letting
                    Quotes become a detached shortcut.
                  </li>
                </ul>
              </div>
            </SectionCard>
          </WizardStepBody>) : null}

        {activeStepId === "pricing" ? (<WizardStepBody title="Pricing lines" description="Keep product linkage and pricing adjustments inside the same quote workflow." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <SectionCard className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Line items
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Pricing stays editable in one step without leaving the quote
                    workflow.
                  </p>
                </div>
                <button type="button" onClick={() => setLineItems((current) => [
                ...current,
                buildLineFromProduct(undefined, currency, pricingBasis),
            ])} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200">
                  Add line
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <RemediationFocusPanel target={activeRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <RemediationReturnPanel target={activeRemediationLoopTarget} isResolved={remediationLoopResolved} onReturn={returnToRemediationSource} onClear={() => setRemediationTarget(null)}/>
                <PricingReadinessPanel lineItems={lineItems} products={products}/>
                <QuoteLineTable lineItems={lineItems} products={products} currency={currency} pricingBasis={pricingBasis} onChangeLine={(index, next) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))} onRemoveLine={(index) => setLineItems((current) => current.filter((_, entryIndex) => entryIndex !== index))} focusLineIndex={activeRemediationTarget?.fieldId === "line_items"
                ? (activeRemediationTarget.lineIndex ?? null)
                : null} focusIssueId={activeRemediationTarget?.fieldId === "line_items"
                ? (activeRemediationTarget.issueId ?? null)
                : null}/>
              </div>
            </SectionCard>
          </WizardStepBody>) : null}

        {activeStepId === "terms" ? (<WizardStepBody title="Terms and posture" description="Set status, approval posture, and internal terms before the final review and send checkpoint." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <SectionCard className="p-4 sm:p-5">
              <div className="space-y-4">
                <RemediationFocusPanel target={activeRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <RemediationReturnPanel target={activeRemediationLoopTarget} isResolved={remediationLoopResolved} onReturn={returnToRemediationSource} onClear={() => setRemediationTarget(null)}/>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "workflow_status")}>
                    <FilterField label="Workflow status">
                      <select className={inputClassName()} value={status} onChange={(event) => setStatus(event.target.value)}>
                        {QUOTE_STATUSES.map((quoteStatus) => (<option key={quoteStatus} value={quoteStatus}>
                            {quoteStatus.replaceAll("_", " ")}
                          </option>))}
                      </select>
                    </FilterField>
                  </div>
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "approval_state")}>
                    <FilterField label="Approval state">
                      <select className={inputClassName()} value={approvalRequired ? approvalState : "not_required"} onChange={(event) => setApprovalState(event.target.value)} disabled={!approvalRequired}>
                        {APPROVAL_STATES.map((state) => (<option key={state} value={state}>
                            {state.replaceAll("_", " ")}
                          </option>))}
                      </select>
                    </FilterField>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={approvalRequired} onChange={(event) => {
                setApprovalRequired(event.target.checked);
                if (!event.target.checked)
                    setApprovalState("not_required");
                else if (approvalState === "not_required")
                    setApprovalState("pending");
            }}/>
                    Approval required before send
                  </label>
                  <FilterField label="Internal terms and notes">
                    <textarea className={`${inputClassName()} min-h-[140px]`} rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Commercial notes, approval guidance, packing assumptions, or send context."/>
                  </FilterField>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">What belongs here</p>
                <ul className="mt-3 space-y-2">
                  <li>• Approval requirement and current approval state.</li>
                  <li>
                    • Internal commercial notes that explain the draft before
                    review.
                  </li>
                  <li>
                    • Workflow posture that keeps send intent explicit without
                    jumping ahead to trust-layer redesign.
                  </li>
                </ul>
              </div>
            </SectionCard>
          </WizardStepBody>) : null}

        {activeStepId === "review" ? (<WizardStepBody title="Review draft" description="Confirm pricing totals, workflow posture, and draft structure before the send checkpoint." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <div className="space-y-4">
              <RemediationCheckpointPanel target={checkpointRemediationTarget} isResolved={checkpointRemediationResolved} onReopen={reopenRemediationTarget} onClear={() => setRemediationTarget(null)}/>
              <SectionCard className="p-4 sm:p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Draft checklist</p>
                  <ul className="mt-3 space-y-2">
                    <li>
                      • The quote remains linked to the current lead and
                      optional RFQ without schema changes.
                    </li>
                    <li>
                      • Product, pricing, and terms now read as one guided draft
                      instead of a loose three-step form.
                    </li>
                    <li>
                      • Approval posture stays readable before the explicit send
                      checkpoint is reached.
                    </li>
                  </ul>
                </div>
              </SectionCard>
              <CheckpointReadinessPanel recommendations={stepRecommendations.filter((recommendation) => recommendation.stepId !== "send")} onJump={applyRemediationJump} mode="review"/>
              <StepRemediationPanel recommendations={stepRecommendations.filter((recommendation) => recommendation.stepId !== "send")} onJump={applyRemediationJump} mode="review"/>
              <SectionCard className="p-4 sm:p-5">
                <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Validation
                  </p>
                  {hasReviewBlockingIssues ? (<ul className="mt-2 list-disc space-y-1 pl-5 text-rose-700">
                      {reviewIssues.map((issue) => (<li key={issue}>{issue}</li>))}
                    </ul>) : (<p className="mt-2 text-emerald-700">
                      Ready for the send checkpoint. No blocking issues are
                      currently flagged in the draft.
                    </p>)}
                </div>
              </SectionCard>
            </div>
          </WizardStepBody>) : null}

        {activeStepId === "send" ? (<WizardStepBody title="Send checkpoint" description="Make send blockers explicit before the quote can move forward. Saving here still creates the draft inside the current workflow." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <SectionCard className="p-4 sm:p-5">
              <div className={`rounded-2xl border p-4 text-sm ${status === "sent" && !quoteSendGuard?.blockerCount && (!approvalRequired || approvalState === "approved") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                <p className="font-medium text-slate-900">Send posture</p>
                <ul className="mt-3 space-y-2">
                  <li>• Status selected: {status.replaceAll("_", " ")}</li>
                  <li>
                    • Approval posture:{" "}
                    {(approvalRequired
                ? approvalState
                : "not_required").replaceAll("_", " ")}
                  </li>
                  <li>• Send blockers: {quoteSendGuard?.blockerCount ?? 0}</li>
                </ul>
              </div>
              <div className="mt-4 space-y-3">
                <RemediationCheckpointPanel target={checkpointRemediationTarget} isResolved={checkpointRemediationResolved} onReopen={reopenRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <RemediationFocusPanel target={activeRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <CheckpointReadinessPanel recommendations={stepRecommendations} onJump={applyRemediationJump} mode="send"/>
                <StepRemediationPanel recommendations={stepRecommendations} onJump={applyRemediationJump} mode="send"/>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">
                    What this step does
                  </p>
                  <ul className="mt-3 space-y-2">
                    <li>• Makes send readiness visible before save.</li>
                    <li>
                      • Stops premature send states when approval or blocker
                      checks are still open.
                    </li>
                    <li>
                      • Keeps deeper trust-layer and locking work sequenced for
                      the next roadmap phase.
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">
                    Current checkpoint
                  </p>
                  {(quoteSendGuard?.blockerCount ?? 0) > 0 ? (<ul className="mt-3 list-disc space-y-1 pl-5 text-amber-900">
                      {quoteSendGuard?.blockerReasons.map((reason) => (<li key={reason}>{reason}</li>))}
                    </ul>) : (<p className="mt-3 text-emerald-700">
                      No send blockers are currently flagged by the quote guard.
                    </p>)}
                </div>
              </div>
            </SectionCard>
          </WizardStepBody>) : null}
      </WizardShell>

      <CommercialWizardFooter title="Quote workflow" description="Save the quote with product, pricing, terms, review, and send posture kept inside one guided builder flow." error={state.error} success={state.success} isPending={false} activeStepIndex={activeIndex} totalSteps={QUOTE_CREATE_STEPS.length} activeStepTitle={currentStep.title} canGoBack={activeIndex > 0} onBack={() => setActiveStepId(QUOTE_CREATE_STEPS[Math.max(activeIndex - 1, 0)]?.id)} onCancel={onClose} onNext={goNext} submitLabel="Create quote"/>
    </form>);
}
function QuoteEditorSaveButton({ disabled, pending, }) {
    return (<button type="submit" disabled={pending || disabled} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
      {pending
            ? "Saving quote..."
            : disabled
                ? "Resolve issues to save"
                : "Save quote"}
    </button>);
}
function QuoteSummaryCards({ currency, status, approvalRequired, approvalState, lineItems, templateId, products, quoteSendGuard, }) {
    const totals = computeQuoteTotals(lineItems, normalizeCurrency(currency));
    const template = getPricingTemplate(templateId);
    const riskFlags = getQuoteRiskFlags({
        lineItems,
        approvalRequired,
        approvalState,
        status,
        products,
        quoteSendGuard,
    });
    const riskCount = riskFlags.filter((flag) => flag.tone !== "good").length;
    const primaryRisk = riskFlags.find((flag) => flag.tone !== "good") ?? riskFlags[0];
    return (<div className="grid gap-3 lg:grid-cols-6">
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Subtotal
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {totals.currency} {totals.subtotal.toFixed(2)}
        </p>
      </div>
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Line items
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {totals.lineItemCount}
        </p>
      </div>
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Currency
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {normalizeCurrency(currency) || "Unset"}
        </p>
      </div>
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Status
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getQuoteStatusBadgeClasses(status)}`}>
            {status.replaceAll("_", " ")}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getApprovalBadgeClasses((approvalRequired ? approvalState : "not_required"))}`}>
            {(approvalRequired ? approvalState : "not_required").replaceAll("_", " ")}
          </span>
        </div>
      </div>
      <div className="rounded-[1rem] bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Template
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {template?.name ?? "Manual pricing"}
        </p>
      </div>
      <div className={`rounded-[1rem] px-4 py-3 ${primaryRisk ? getRiskFlagClasses(primaryRisk.tone) : "bg-slate-50"}`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
          Risk cues
        </p>
        <p className="mt-2 text-sm font-semibold">
          {riskCount
            ? `${riskCount} attention cue${riskCount === 1 ? "" : "s"}`
            : "No active risk cues"}
        </p>
        <p className="mt-1 text-xs leading-5">
          {primaryRisk?.label ?? "Draft posture is currently clear."}
        </p>
      </div>
    </div>);
}
export function QuoteEditWizardForm({ quote, products, quoteVersions = [], quoteSendGuard, initialStepId, onClose, onSaved, }) {
    const [state, setState] = useState({});
    const [isSaving, startSavingTransition] = useTransition();
    const parsed = useMemo(() => parseQuoteWorkflow(quote.notes), [quote.notes]);
    const [activeStepId, setActiveStepId] = useState(initialStepId ?? "product");
    const [validationIssues, setValidationIssues] = useState([]);
    const [remediationTarget, setRemediationTarget] = useState(null);
    const [currency, setCurrency] = useState(quote.currency ?? "USD");
    const [templateId, setTemplateId] = useState(parsed.meta.templateId ?? "");
    const [approvalRequired, setApprovalRequired] = useState(parsed.meta.approval?.required ?? false);
    const [approvalState, setApprovalState] = useState(parsed.meta.approval?.state ?? "not_required");
    const [status, setStatus] = useState(getQuoteWorkflowStatus(quote, parsed.meta.approval));
    const [notes, setNotes] = useState(parsed.plainNotes ?? "");
    const [pricingBasis, setPricingBasis] = useState(normalizePricingBasis(parsed.meta.pricingBasis ?? "fob"));
    const [lineItems, setLineItems] = useState(() => {
        const initialBasis = normalizePricingBasis(parsed.meta.pricingBasis ?? "fob");
        const existingItems = (quote.lineItems ?? []).map((item) => hydrateExistingLineWithCatalog(item, products, quote.currency ?? "USD", initialBasis));
        return existingItems.length
            ? existingItems
            : [
                buildLineFromProduct(products[0], quote.currency ?? "USD", initialBasis),
            ];
    });
    useEffect(() => {
        setActiveStepId(initialStepId ?? "product");
        setRemediationTarget(null);
    }, [initialStepId, quote.id]);
    const formId = `quote-edit-form-${quote.id}`;
    const activeIndex = QUOTE_EDIT_STEPS.findIndex((step) => step.id === activeStepId);
    const currentStep = QUOTE_EDIT_STEPS[activeIndex] ?? QUOTE_EDIT_STEPS[0];
    const currentIssues = getQuoteValidation(activeStepId, {
        currency,
        approvalRequired,
        approvalState,
        status,
        lineItems,
        quoteSendGuard,
    });
    const reviewIssues = getQuoteValidation("review", {
        currency,
        approvalRequired,
        approvalState,
        status,
        lineItems,
        quoteSendGuard,
    });
    const stepRecommendations = getStepRecommendations({
        currency,
        approvalRequired,
        approvalState,
        status,
        lineItems,
        products,
        quoteSendGuard,
    });
    const activeRemediationTarget = remediationTarget?.stepId === activeStepId ? remediationTarget : null;
    const activeRemediationLoopTarget = activeRemediationTarget?.sourceStepId
        ? activeRemediationTarget
        : null;
    const checkpointRemediationTarget = remediationTarget?.sourceStepId === activeStepId ? remediationTarget : null;
    const remediationLoopResolved = activeRemediationLoopTarget
        ? isRemediationTargetResolved(activeRemediationLoopTarget, {
            currency,
            approvalRequired,
            approvalState,
            status,
            lineItems,
            products,
            quoteSendGuard,
        })
        : false;
    const checkpointRemediationResolved = checkpointRemediationTarget
        ? isRemediationTargetResolved(checkpointRemediationTarget, {
            currency,
            approvalRequired,
            approvalState,
            status,
            lineItems,
            products,
            quoteSendGuard,
        })
        : false;
    const hasBlockingIssues = reviewIssues.length > 0;
    const summarySnapshot = useMemo(() => JSON.stringify({
        currency: normalizeCurrency(currency),
        templateId,
        approvalRequired,
        approvalState,
        status,
        notes,
        pricingBasis,
        lineItems,
    }), [
        currency,
        templateId,
        approvalRequired,
        approvalState,
        status,
        notes,
        pricingBasis,
        lineItems,
    ]);
    const initialSnapshot = useMemo(() => JSON.stringify({
        currency: normalizeCurrency(quote.currency ?? "USD"),
        templateId: parsed.meta.templateId ?? "",
        approvalRequired: parsed.meta.approval?.required ?? false,
        approvalState: parsed.meta.approval?.state ?? "not_required",
        status: getQuoteWorkflowStatus(quote, parsed.meta.approval),
        notes: parsed.plainNotes ?? "",
        pricingBasis: normalizePricingBasis(parsed.meta.pricingBasis ?? "fob"),
        lineItems: (quote.lineItems ?? []).map((item) => hydrateExistingLineWithCatalog(item, products, quote.currency ?? "USD", normalizePricingBasis(parsed.meta.pricingBasis ?? "fob"))),
    }), [
        parsed.meta.approval,
        parsed.meta.pricingBasis,
        parsed.meta.templateId,
        parsed.plainNotes,
        products,
        quote,
        quote.currency,
        quote.lineItems,
    ]);
    const hasUnsavedChanges = summarySnapshot !== initialSnapshot;
    useEffect(() => {
        if (state.success) {
            if (state.record)
                onSaved?.(state.record);
            onClose();
        }
    }, [onClose, onSaved, state.record, state.success]);
    const applyRemediationJump = (recommendation, sourceStepId) => {
        setValidationIssues([]);
        setActiveStepId(recommendation.stepId);
        setRemediationTarget(buildRemediationTarget(recommendation, sourceStepId));
    };
    const returnToRemediationSource = () => {
        if (!activeRemediationLoopTarget?.sourceStepId)
            return;
        setValidationIssues([]);
        setActiveStepId(activeRemediationLoopTarget.sourceStepId);
    };
    const reopenRemediationTarget = () => {
        if (!checkpointRemediationTarget)
            return;
        setValidationIssues([]);
        setActiveStepId(checkpointRemediationTarget.stepId);
    };
    const goNext = () => {
        const issues = getQuoteValidation(activeStepId, {
            currency,
            approvalRequired,
            approvalState,
            status,
            lineItems,
            quoteSendGuard,
        });
        setValidationIssues(issues);
        if (issues.length)
            return;
        setRemediationTarget(null);
        setActiveStepId(QUOTE_EDIT_STEPS[Math.min(activeIndex + 1, QUOTE_EDIT_STEPS.length - 1)]
            ?.id);
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        if (hasBlockingIssues || !hasUnsavedChanges || isSaving)
            return;
        const formData = new FormData(event.currentTarget);
        formData.set("quote_id", quote.id);
        formData.set("currency", normalizeCurrency(currency));
        formData.set("template_id", templateId);
        formData.set("approval_required", approvalRequired ? "true" : "false");
        formData.set("approval_state", approvalRequired ? approvalState : "not_required");
        formData.set("status", status);
        formData.set("notes", notes);
        formData.set("pricing_basis", pricingBasis);
        formData.set("line_items", JSON.stringify(lineItems.map((item) => ({
            ...item,
            currency: normalizeCurrency(item.currency || currency),
            catalog_price_currency: normalizeCurrency(item.catalog_price_currency || item.currency || currency),
            is_price_overridden: isLinePriceOverridden(item),
        }))));
        setState({});
        startSavingTransition(() => {
            void updateQuoteWorkflow(undefined, formData)
                .then((result) => {
                setState(result ?? {});
            })
                .catch((error) => {
                setState({
                    error: error instanceof Error ? error.message : "Failed to save quote.",
                });
            });
        });
    };
    return (<form id={formId} onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="quote_id" value={quote.id}/>
      <input type="hidden" name="currency" value={normalizeCurrency(currency)}/>
      <input type="hidden" name="template_id" value={templateId}/>
      <input type="hidden" name="approval_required" value={approvalRequired ? "true" : "false"}/>
      <input type="hidden" name="approval_state" value={approvalRequired ? approvalState : "not_required"}/>
      <input type="hidden" name="status" value={status}/>
      <input type="hidden" name="notes" value={notes}/>
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems.map((item) => ({
            ...item,
            currency: normalizeCurrency(item.currency || currency),
            catalog_price_currency: normalizeCurrency(item.catalog_price_currency || item.currency || currency),
            is_price_overridden: isLinePriceOverridden(item),
        })))} readOnly/>
      <input type="hidden" name="pricing_basis" value={pricingBasis} readOnly/>

      <WizardShell steps={QUOTE_EDIT_STEPS} activeStepId={activeStepId} onStepChange={(nextStep) => {
            const issues = getQuoteValidation(activeStepId, {
                currency,
                approvalRequired,
                approvalState,
                status,
                lineItems,
                quoteSendGuard,
            });
            if (QUOTE_EDIT_STEPS.findIndex((step) => step.id === nextStep) >
                activeIndex &&
                issues.length) {
                setValidationIssues(issues);
                return;
            }
            setValidationIssues([]);
            setRemediationTarget((current) => current &&
                (current.stepId === nextStep || current.sourceStepId === nextStep)
                ? current
                : null);
            setActiveStepId(nextStep);
        }} summary={<WizardValidationSummary title="Resolve before continuing" issues={validationIssues.length ? validationIssues : currentIssues} tone="info"/>}>
        {activeStepId === "product" ? (<WizardStepBody title="Workflow context" description="Keep existing quote edits inside the same guided builder sequence already used for draft creation." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <SectionCard className="p-4 sm:p-5">
              <div className="space-y-4">
                <RemediationFocusPanel target={activeRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <RemediationReturnPanel target={activeRemediationLoopTarget} isResolved={remediationLoopResolved} onReturn={returnToRemediationSource} onClear={() => setRemediationTarget(null)}/>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "pricing_basis")}>
                    <FilterField label="Pricing basis">
                      <select className={inputClassName()} value={pricingBasis} onChange={(event) => {
                const nextBasis = normalizePricingBasis(event.target.value);
                setPricingBasis(nextBasis);
                setLineItems((current) => current.map((line) => applyPricingBasisToLine(line, products, currency, nextBasis)));
            }}>
                        <option value="ex_factory">Ex-Factory</option>
                        <option value="fob">FOB</option>
                        <option value="cif">CIF</option>
                      </select>
                    </FilterField>
                  </div>
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "currency")}>
                    <FilterField label="Currency">
                      <input className={inputClassName()} value={currency} onChange={(event) => setCurrency(normalizeCurrency(event.target.value))} maxLength={3}/>
                    </FilterField>
                  </div>
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "template_id")}>
                    <FilterField label="Template">
                      <select className={inputClassName()} value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                        <option value="">No template</option>
                        {PRICING_TEMPLATES.map((template) => (<option key={template.id} value={template.id}>
                            {template.name}
                          </option>))}
                      </select>
                    </FilterField>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    <p className="font-medium text-slate-900">
                      Why this step stays first
                    </p>
                    <ul className="mt-3 space-y-2">
                      <li>
                        • Existing quotes now reopen in the same Product →
                        Pricing → Terms → Review → Send rhythm as new drafts.
                      </li>
                      <li>
                        • Basis, currency, and template remain the commercial
                        frame for every later edit.
                      </li>
                      <li>
                        • This preserves the current roadmap order without
                        reopening lead or trust-layer work.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </SectionCard>
          </WizardStepBody>) : null}

        {activeStepId === "pricing" ? (<WizardStepBody title="Pricing summary" description="Review and edit live quote lines inside the guided builder instead of dropping back to a flat editor." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <SectionCard className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Quote lines
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Every line keeps pack, MOQ, catalog baseline, quote price,
                    and total visible in one guided step.
                  </p>
                </div>
                <button type="button" onClick={() => setLineItems((current) => [
                ...current,
                buildLineFromProduct(products[0], currency, pricingBasis),
            ])} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Add product
                </button>
              </div>
              <div className="mt-4 space-y-4">
                <RemediationFocusPanel target={activeRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <RemediationReturnPanel target={activeRemediationLoopTarget} isResolved={remediationLoopResolved} onReturn={returnToRemediationSource} onClear={() => setRemediationTarget(null)}/>
                <PricingReadinessPanel lineItems={lineItems} products={products}/>
                <QuoteLineTable lineItems={lineItems} products={products} currency={currency} pricingBasis={pricingBasis} onChangeLine={(index, next) => setLineItems((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))} onRemoveLine={(index) => setLineItems((current) => current.filter((_, entryIndex) => entryIndex !== index))} focusLineIndex={activeRemediationTarget?.fieldId === "line_items"
                ? (activeRemediationTarget.lineIndex ?? null)
                : null} focusIssueId={activeRemediationTarget?.fieldId === "line_items"
                ? (activeRemediationTarget.issueId ?? null)
                : null}/>
              </div>
            </SectionCard>
          </WizardStepBody>) : null}

        {activeStepId === "terms" ? (<WizardStepBody title="Terms and posture" description="Keep approval posture, workflow status, and internal commercial notes inside the same drawer." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <SectionCard className="p-4 sm:p-5">
              <div className="space-y-4">
                <RemediationFocusPanel target={activeRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <RemediationReturnPanel target={activeRemediationLoopTarget} isResolved={remediationLoopResolved} onReturn={returnToRemediationSource} onClear={() => setRemediationTarget(null)}/>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "workflow_status")}>
                    <FilterField label="Workflow status">
                      <select className={inputClassName()} value={status} onChange={(event) => setStatus(event.target.value)}>
                        {QUOTE_STATUSES.map((quoteStatus) => (<option key={quoteStatus} value={quoteStatus}>
                            {quoteStatus.replaceAll("_", " ")}
                          </option>))}
                      </select>
                    </FilterField>
                  </div>
                  <div className={getFieldFocusClasses(activeRemediationTarget?.fieldId === "approval_state")}>
                    <FilterField label="Approval state">
                      <select className={inputClassName()} value={approvalRequired ? approvalState : "not_required"} onChange={(event) => setApprovalState(event.target.value)} disabled={!approvalRequired}>
                        {APPROVAL_STATES.map((entry) => (<option key={entry} value={entry}>
                            {entry.replaceAll("_", " ")}
                          </option>))}
                      </select>
                    </FilterField>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={approvalRequired} onChange={(event) => {
                setApprovalRequired(event.target.checked);
                if (!event.target.checked)
                    setApprovalState("not_required");
                else if (approvalState === "not_required")
                    setApprovalState("pending");
            }}/>
                    Approval required before send
                  </label>
                  <FilterField label="Internal terms and notes">
                    <textarea className={`${inputClassName()} min-h-[140px]`} rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Commercial notes, approval guidance, packing assumptions, or send context."/>
                  </FilterField>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-medium text-slate-900">What belongs here</p>
                <ul className="mt-3 space-y-2">
                  <li>
                    • Status and approval posture stay explicit before review or
                    send decisions.
                  </li>
                  <li>
                    • Internal notes remain available without splitting the
                    workflow across separate quote tools.
                  </li>
                  <li>
                    • The existing worker fix and current schema stay untouched
                    by this batch.
                  </li>
                </ul>
              </div>
            </SectionCard>
          </WizardStepBody>) : null}

        {activeStepId === "review" ? (<WizardStepBody title="Review and save" description="Confirm totals, workflow posture, and save readiness before the send checkpoint." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <div className="space-y-4">
              <RemediationCheckpointPanel target={checkpointRemediationTarget} isResolved={checkpointRemediationResolved} onReopen={reopenRemediationTarget} onClear={() => setRemediationTarget(null)}/>
              <QuoteSummaryCards currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>
              <QuoteVersionCheckpointPanel quote={quote} quoteVersions={quoteVersions} mode="review"/>
              <CheckpointReadinessPanel recommendations={stepRecommendations.filter((recommendation) => recommendation.stepId !== "send")} onJump={applyRemediationJump} mode="review"/>
              <StepRemediationPanel recommendations={stepRecommendations.filter((recommendation) => recommendation.stepId !== "send")} onJump={applyRemediationJump} mode="review"/>
              <SectionCard className="p-4 sm:p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      What this save does
                    </p>
                    <ul className="mt-2 space-y-2">
                      <li>
                        • Saves all guided edits back into the current quote
                        workflow.
                      </li>
                      <li>
                        • Keeps catalog baseline and final quote pricing
                        separate.
                      </li>
                      <li>• Refreshes the selected buyer quote after save.</li>
                    </ul>
                  </div>
                  <div className="rounded-[1rem] bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Validation
                    </p>
                    {hasBlockingIssues ? (<ul className="mt-2 list-disc space-y-1 pl-5 text-rose-700">
                        {reviewIssues.map((issue) => (<li key={issue}>{issue}</li>))}
                      </ul>) : (<p className="mt-2 text-emerald-700">
                        Ready to save. No blocking issues found in the current
                        quote.
                      </p>)}
                  </div>
                </div>
              </SectionCard>
            </div>
          </WizardStepBody>) : null}

        {activeStepId === "send" ? (<WizardStepBody title="Send checkpoint" description="Keep send blockers and approval posture explicit before the quote leaves the team." aside={<QuoteReviewPanel currency={currency} status={status} approvalRequired={approvalRequired} approvalState={approvalState} lineItems={lineItems} templateId={templateId} products={products} quoteSendGuard={quoteSendGuard}/>}>
            <SectionCard className="p-4 sm:p-5">
              <div className={`rounded-2xl border p-4 text-sm ${status === "sent" && !quoteSendGuard?.blockerCount && (!approvalRequired || approvalState === "approved") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                <p className="font-medium text-slate-900">Send posture</p>
                <ul className="mt-3 space-y-2">
                  <li>• Status selected: {status.replaceAll("_", " ")}</li>
                  <li>
                    • Approval posture:{" "}
                    {(approvalRequired
                ? approvalState
                : "not_required").replaceAll("_", " ")}
                  </li>
                  <li>• Send blockers: {quoteSendGuard?.blockerCount ?? 0}</li>
                </ul>
              </div>
              <div className="mt-4 space-y-3">
                <RemediationCheckpointPanel target={checkpointRemediationTarget} isResolved={checkpointRemediationResolved} onReopen={reopenRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <RemediationFocusPanel target={activeRemediationTarget} onClear={() => setRemediationTarget(null)}/>
                <CheckpointReadinessPanel recommendations={stepRecommendations} onJump={applyRemediationJump} mode="send"/>
                <StepRemediationPanel recommendations={stepRecommendations} onJump={applyRemediationJump} mode="send"/>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">
                    What this step does
                  </p>
                  <ul className="mt-3 space-y-2">
                    <li>• Makes send readiness visible before save.</li>
                    <li>
                      • Keeps approval or blocker checks explicit while the
                      quote remains editable.
                    </li>
                    <li>
                      • Avoids jumping ahead into quote locking or trust-layer
                      redesign.
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">
                    Current checkpoint
                  </p>
                  {(quoteSendGuard?.blockerCount ?? 0) > 0 ? (<ul className="mt-3 list-disc space-y-1 pl-5 text-amber-900">
                      {quoteSendGuard?.blockerReasons.map((reason) => (<li key={reason}>{reason}</li>))}
                    </ul>) : (<p className="mt-3 text-emerald-700">
                      No send blockers are currently flagged by the quote guard.
                    </p>)}
                </div>
              </div>
              <div className="mt-4">
                <QuoteVersionCheckpointPanel quote={quote} quoteVersions={quoteVersions} mode="send"/>
              </div>
            </SectionCard>
          </WizardStepBody>) : null}
      </WizardShell>

      <CommercialWizardFooter title="Quote workflow" description={hasUnsavedChanges
            ? "You have unsaved quote changes inside the guided quote workflow."
            : "No pending quote edits."} error={state.error} success={state.success} isPending={isSaving} activeStepIndex={activeIndex} totalSteps={QUOTE_EDIT_STEPS.length} activeStepTitle={currentStep.title} canGoNext={activeStepId === "send"
            ? hasUnsavedChanges && !hasBlockingIssues
            : true} canGoBack={activeIndex > 0} onBack={() => setActiveStepId(QUOTE_EDIT_STEPS[Math.max(activeIndex - 1, 0)]?.id)} onCancel={onClose} onNext={goNext} submitLabel={hasUnsavedChanges ? "Save quote" : "No changes to save"} submitFormId={formId}/>
    </form>);
}
