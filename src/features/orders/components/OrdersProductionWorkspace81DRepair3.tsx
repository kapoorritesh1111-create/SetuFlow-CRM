'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  addManualActualOrderLineAction,
  approveActualOrderLinesGateAction,
  approveDeliveryNoteAction,
  approveFinalInvoiceGateAction,
  approveFirstDocumentGateAction,
  approvePackingOverridesAction,
  closeOrderAction,
  markQueueEventManuallyCompletedAction,
  prepareFinalInvoiceGateAction,
  prepareFirstDocumentGateAction,
  previewFinalInvoiceGateAction,
  queueFinanceIntegrationEventAction,
  queueFreightBookingEventAction,
  removeActualOrderLineAction,
  retryPendingQueueEventAction,
  saveOrderDiscountAction,
  savePackingOverridesAction,
  saveProcessingCheckAction,
  sendOrderDocumentLinkAction,
  updateActualOrderLineAction,
} from '@/features/orders/server';

export type CatalogOrderOption8S = {
  id: string;
  label: string;
  productName: string;
  variantName?: string | null;
  skuCode?: string | null;
  hsnCode?: string | null;
  pricingType?: string | null;
  basisLabel: string;
  fobPrice: number | null;
  exFactoryPrice: number | null;
  bulkPrice: number | null;
  currency: string;
};

export type OrderLineComparison8S = {
  id: string;
  productName: string;
  quotedQuantity: number | null;
  actualQuantity: number | null;
  unitOfMeasure: string | null;
  unitPrice: number | null;
  currency: string | null;
  quotedTotal: number | null;
  lineTotal: number | null;
  status: 'unchanged' | 'changed' | 'removed' | 'added' | 'needs_actual_lines';
  variantName?: string | null;
  skuCode?: string | null;
  hsnCode?: string | null;
  reason?: string | null;
  isActual: boolean;
  pricingBasis?: string | null;
  lineDiscountType?: string | null;
  lineDiscountValue?: number | null;
  lineDiscountReason?: string | null;
};

export type ProductionOrderGate8S = {
  id: string;
  stageKey: string | null;
  gateType: string | null;
  status: string | null;
  approvedAt?: string | null;
  previewedAt?: string | null;
  completedAt?: string | null;
  reason?: string | null;
};

export type ProductionOrderDocumentSend8X = {
  id: string;
  channel: string | null;
  recipient: string | null;
  status: string | null;
  shareUrl?: string | null;
  whatsappLink?: string | null;
  sentAt?: string | null;
  openedAt?: string | null;
  openCount?: number | null;
  recipientRole?: string | null;
};

export type ProductionOrderDocument8W = {
  id: string;
  documentType: string | null;
  status: string | null;
  pdfStoragePath?: string | null;
  sends?: ProductionOrderDocumentSend8X[];
  sentAt?: string | null;
  openedAt?: string | null;
};

export type QueueEvent8S = {
  id: string;
  eventType: string | null;
  adapterName: string | null;
  status: string | null;
  orderDocumentId?: string | null;
  freightRateRequestId?: string | null;
  shipmentMode?: string | null;
  payload?: unknown;
  responsePayload?: unknown;
  externalRef?: string | null;
  bookingReference?: string | null;
  trackingReference?: string | null;
  errorMessage?: string | null;
  retryCount?: number | null;
  queuedAt?: string | null;
  sentAt?: string | null;
  confirmedAt?: string | null;
  updatedAt?: string | null;
};

export type PackingPlan8S = {
  id: string;
  status: string | null;
  totalCartons?: number | null;
  totalPallets?: number | null;
  totalNetWeightKg?: number | null;
  totalGrossWeightKg?: number | null;
  totalCbm?: number | null;
  pickupLocation?: string | null;
  deliveryDestination?: string | null;
  freightNotes?: string | null;
  overrideSnapshot?: unknown;
  updatedAt?: string | null;
};

export type FreightRateRequest8S = {
  id: string;
  status: string | null;
  shipmentMode?: string | null;
  incoterm?: string | null;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  payload?: unknown;
  updatedAt?: string | null;
};

export type ProcessingCheck8S = {
  id: string;
  status: string | null;
  picked?: boolean | null;
  packed?: boolean | null;
  qcPassed?: boolean | null;
  note?: string | null;
  updatedAt?: string | null;
};

export type Shipment8S = {
  id: string;
  shipmentMode?: string | null;
  status: string | null;
  bookingReference?: string | null;
  trackingNumber?: string | null;
  carrierName?: string | null;
  forwarderName?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  updatedAt?: string | null;
};

export type StageEvent8S = {
  id: string;
  stageKey: string | null;
  eventType: string | null;
  summary: string | null;
  payload?: unknown;
  createdAt?: string | null;
};

export type ProductionOrder8S = {
  orderId?: string | null;
  orderNumber?: string | null;
  quoteId: string;
  leadId: string;
  companyName: string;
  orderType: 'regional' | 'export';
  currency: string | null;
  actualTotal: number | null;
  quotedTotal: number | null;
  currentStage?: string | null;
  executionState: string;
  productContext?: string | null;
  country: string | null;
  defaultEmailRecipient?: string | null;
  defaultWhatsappRecipient?: string | null;
  defaultRecipientRole?: string | null;
  lines: OrderLineComparison8S[];
  documents?: ProductionOrderDocument8W[];
  gates?: ProductionOrderGate8S[];
  blockerCount: number;
  nextAction: string;
  contractId: string | null;
  status: string;
  blockerReasons: string[];
  documentCount: number;
  orgCountry: string | null;
  contactName?: string | null;
  defaultRecipient?: string | null;
  approvalState?: string | null;
  sourceQuoteVersionId?: string | null;
  acceptedVersionId?: string | null;
  versionLabel?: string | null;
  gateCount?: number;
  pricingBasis?: string | null;
  orderDiscountType?: string | null;
  orderDiscountValue?: number | null;
  orderDiscountReason?: string | null;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  dispatchStatus?: string | null;
  incoterm?: string | null;
  originPlace?: string | null;
  destinationPlace?: string | null;
  destinationPort?: string | null;
  buyerReference?: string | null;
  paymentTerms?: string | null;
  packingPlan?: PackingPlan8S | null;
  packingOverrides?: Record<string, unknown> | null;
  freightRateRequest?: FreightRateRequest8S | null;
  processingCheck?: ProcessingCheck8S | null;
  shipment?: Shipment8S | null;
  financeEvents?: QueueEvent8S[];
  freightEvents?: QueueEvent8S[];
  stageEvents?: StageEvent8S[];
  closeout?: Record<string, unknown> | null;
};

type ServerAction = (formData: FormData) => void | Promise<void>;
type OrderTypeFilter = 'all' | 'regional' | 'export';
type KpiFilter = 'all' | 'ready_now' | 'blocked' | 'finance_ready' | 'freight_ready' | 'whatsapp_ready' | null;
type ReadinessFilter = 'all' | 'ready' | 'blocked' | 'finance_ready' | 'freight_ready' | 'whatsapp_ready';
type DrawerState = { type: 'finance' | 'freight'; order: ProductionOrder8S } | null;

/* SF-18-046: SVG icon map — replaces all emoji stage/KPI icons */
function OrdIcon({ k, size = 14 }: { k: string; size?: number }) {
  const s = `${size}px`;
  const paths: Record<string, string> = {
    'list-check': 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4',
    'file': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5z',
    'package': 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM12 2l7 4-7 4-7-4zm0 20-7-4v-8l7 4z',
    'truck': 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 21a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
    'clipboard': 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z',
    'receipt': 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1zm3 5h10M7 12h10M7 17h6',
    'flag': 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
    'bar-chart': 'M18 20V10M12 20V4M6 20v-6',
    'block': 'M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10zM4.93 4.93l14.14 14.14',
    'credit-card': 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22',
    'message': 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  };
  const d = paths[k] ?? paths['file'];
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const STAGES = [
  { key: 'actual_lines', label: 'Actual Lines', icon: 'list-check' },
  { key: 'buyer_doc', label: 'Buyer Doc', icon: 'file' },
  { key: 'packing', label: 'Packing', icon: 'package' },
  { key: 'freight_queue', label: 'Freight Queue', icon: 'truck' },
  { key: 'processing', label: 'Processing', icon: 'check-circle' },
  { key: 'delivery_note', label: 'Delivery Note', icon: 'clipboard' },
  { key: 'final_invoice', label: 'Final Invoice', icon: 'receipt' },
  { key: 'paid_closed', label: 'Paid & Closed', icon: 'flag' },
] as const;

type StageKey = typeof STAGES[number]['key'];

function orderKey(order: ProductionOrder8S) {
  return order.orderId ?? order.quoteId;
}

function clean(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return 'Not available';
  return `${currency ?? 'USD'} ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'SF';
}

function normalizeUrl(value?: string | null) {
  const text = clean(value);
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  if (text.startsWith('/')) return text;
  return `https://${text}`;
}

function lineQty(line: OrderLineComparison8S) {
  return asNumber(line.actualQuantity ?? line.quotedQuantity, 0);
}

function titleCase(value: string | null | undefined) {
  const text = clean(value);
  if (!text) return 'Not set';
  return text.replace(/[_-]+/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function gateApproved(order: ProductionOrder8S, stageKeys: string[], gateTypes?: string[]) {
  return (order.gates ?? []).some((gate) => {
    const status = String(gate.status ?? '').toLowerCase();
    const stageKey = String(gate.stageKey ?? '');
    const gateType = String(gate.gateType ?? '');
    return status === 'approved' && stageKeys.includes(stageKey) && (!gateTypes?.length || gateTypes.includes(gateType));
  });
}

function documentTypeForBuyer(order: ProductionOrder8S) {
  return order.orderType === 'export' ? 'proforma_invoice' : 'order_confirmation';
}

function documentLabel(type: string) {
  const labels: Record<string, string> = {
    proforma_invoice: 'Proforma Invoice',
    order_confirmation: 'Order Confirmation',
    packing_sheet: 'Packing Sheet',
    packing_list: 'Packing List',
    delivery_note: 'Delivery Note',
    dispatch_invoice: 'Final Invoice',
  };
  return labels[type] ?? titleCase(type);
}

function documentForType(order: ProductionOrder8S, documentType: string) {
  return (order.documents ?? []).find((document) => document.documentType === documentType) ?? null;
}

function documentApproved(order: ProductionOrder8S, documentType: string) {
  return (order.documents ?? []).some((document) => document.documentType === documentType && String(document.status).toLowerCase() === 'approved')
    || (documentType === 'dispatch_invoice'
      ? gateApproved(order, ['final_invoice', 'dispatch_invoice'], ['dispatch_invoice', 'final_invoice'])
      : documentType === 'delivery_note'
        ? gateApproved(order, ['delivery_note'], ['delivery_note'])
        : gateApproved(order, ['first_document'], [documentType]));
}

function latestShareUrl(order: ProductionOrder8S, documentType: string) {
  const document = documentForType(order, documentType);
  return normalizeUrl((document?.sends ?? []).find((send) => send.shareUrl)?.shareUrl);
}

function latestWhatsappLink(order: ProductionOrder8S, documentType: string) {
  const document = documentForType(order, documentType);
  return normalizeUrl((document?.sends ?? []).find((send) => send.whatsappLink)?.whatsappLink);
}

function pdfHref(order: ProductionOrder8S, documentType: string) {
  if (!order.contractId) return null;
  if (documentType === 'dispatch_invoice') return `/api/orders/${encodeURIComponent(order.contractId)}/invoice/pdf`;
  if (documentType === 'order_confirmation') return `/api/orders/${encodeURIComponent(order.contractId)}/order-confirmation/pdf`;
  return null;
}

function workflow(order: ProductionOrder8S) {
  const buyerDocumentType = documentTypeForBuyer(order);
  const actualApproved = gateApproved(order, ['internal_review'], ['actual_lines']);
  const buyerDocumentApproved = documentApproved(order, buyerDocumentType);
  const packingApproved = gateApproved(order, ['packing_sheet'], ['packing_sheet']);
  const freightQueued = Boolean((order.freightEvents ?? []).length || order.freightRateRequest?.id);
  const processingApproved = gateApproved(order, ['processing'], ['pick_pack_qc']) || Boolean(order.processingCheck?.qcPassed && order.processingCheck?.picked && order.processingCheck?.packed);
  const deliveryApproved = documentApproved(order, 'delivery_note');
  const finalInvoiceApproved = documentApproved(order, 'dispatch_invoice');
  const financeQueued = Boolean((order.financeEvents ?? []).length);
  const paidClosed = String(order.status ?? '').toLowerCase() === 'completed' || gateApproved(order, ['closed'], ['paid_closeout']);
  return { buyerDocumentType, actualApproved, buyerDocumentApproved, packingApproved, freightQueued, processingApproved, deliveryApproved, finalInvoiceApproved, financeQueued, paidClosed };
}

function stageDone(order: ProductionOrder8S, key: StageKey) {
  const state = workflow(order);
  if (key === 'actual_lines') return state.actualApproved;
  if (key === 'buyer_doc') return state.buyerDocumentApproved;
  if (key === 'packing') return state.packingApproved;
  if (key === 'freight_queue') return state.freightQueued;
  if (key === 'processing') return state.processingApproved;
  if (key === 'delivery_note') return state.deliveryApproved;
  if (key === 'final_invoice') return state.finalInvoiceApproved;
  return state.paidClosed;
}

function stageUnlocked(order: ProductionOrder8S, key: StageKey) {
  const state = workflow(order);
  if (key === 'actual_lines') return true;
  if (key === 'buyer_doc') return state.actualApproved;
  if (key === 'packing') return state.buyerDocumentApproved;
  if (key === 'freight_queue') return state.packingApproved;
  if (key === 'processing') return state.packingApproved;
  if (key === 'delivery_note') return state.processingApproved;
  if (key === 'final_invoice') return state.deliveryApproved;
  return state.finalInvoiceApproved;
}

function stageBlocker(order: ProductionOrder8S, key: StageKey) {
  const state = workflow(order);
  if (key === 'buyer_doc' && !state.actualApproved) return 'Actual order lines, discount reasons, and the actual-lines approval gate must be complete first.';
  if (key === 'packing' && !state.buyerDocumentApproved) return 'The first buyer document must be approved before packing work.';
  if (key === 'freight_queue' && !state.packingApproved) return 'Freight queue is locked until the packing plan is saved and approved.';
  if (key === 'processing' && !state.packingApproved) return 'Processing is locked until packing is approved.';
  if (key === 'delivery_note' && !state.processingApproved) return 'Delivery Note is locked until Pick, Pack, and QC are approved.';
  if (key === 'final_invoice' && !state.deliveryApproved) return 'Final Invoice is locked until Delivery Note is approved.';
  if (key === 'paid_closed' && !state.finalInvoiceApproved) return 'Paid & Closed is locked until Final Invoice approval.';
  return null;
}

function inferredStageKey(order: ProductionOrder8S): StageKey {
  const state = workflow(order);
  if (state.paidClosed) return 'paid_closed';
  if (state.finalInvoiceApproved && state.financeQueued) return 'paid_closed';
  if (state.finalInvoiceApproved) return 'final_invoice';
  if (state.deliveryApproved) return 'final_invoice';
  if (state.processingApproved) return 'delivery_note';
  if (state.freightQueued) return 'processing';
  if (state.packingApproved) return 'freight_queue';
  if (state.buyerDocumentApproved) return 'packing';
  if (state.actualApproved) return 'buyer_doc';
  return 'actual_lines';
}

function stageIndex(key: StageKey) {
  return STAGES.findIndex((stage) => stage.key === key);
}

function packingEstimate(order: ProductionOrder8S) {
  const units = order.lines.reduce((sum, line) => sum + lineQty(line), 0);
  const unitsPerCarton = 24;
  const cartons = Math.max(1, Math.ceil(units / unitsPerCarton));
  const net = Number((units * 0.25).toFixed(2));
  const gross = Number((net + cartons * 0.75).toFixed(2));
  const cbm = Number((cartons * 0.035).toFixed(3));
  const pallets = Math.max(1, Math.ceil(cartons / 40));
  return { units, cartons, pallets, netWeightKg: net, grossWeightKg: gross, cbm };
}

function packingMetrics(order: ProductionOrder8S) {
  const estimate = packingEstimate(order);
  const overrides = order.packingOverrides ?? {};
  return {
    units: estimate.units,
    cartons: asNumber(order.packingPlan?.totalCartons ?? overrides.cartons, estimate.cartons),
    pallets: asNumber(order.packingPlan?.totalPallets ?? overrides.pallets, estimate.pallets),
    netWeightKg: asNumber(order.packingPlan?.totalNetWeightKg ?? overrides.net_weight_kg, estimate.netWeightKg),
    grossWeightKg: asNumber(order.packingPlan?.totalGrossWeightKg ?? overrides.gross_weight_kg, estimate.grossWeightKg),
    cbm: asNumber(order.packingPlan?.totalCbm ?? overrides.cbm, estimate.cbm),
    pickup: clean(order.packingPlan?.pickupLocation ?? overrides.pickup ?? order.originPlace) ?? '',
    destination: clean(order.packingPlan?.deliveryDestination ?? overrides.delivery_destination ?? order.destinationPlace ?? order.destinationPort) ?? '',
    dimensions: clean(overrides.dimensions) ?? '',
    freightNotes: clean(order.packingPlan?.freightNotes ?? overrides.freight_notes) ?? '',
  };
}

function freightPayloadComplete(order: ProductionOrder8S) {
  const metrics = packingMetrics(order);
  return Boolean(metrics.cartons && metrics.pallets && metrics.netWeightKg && metrics.grossWeightKg && metrics.cbm && metrics.pickup && metrics.destination && clean(order.freightRateRequest?.shipmentMode ?? 'manual_review') && clean(order.freightRateRequest?.incoterm ?? order.incoterm));
}

function isFinanceQueueReady(order: ProductionOrder8S) {
  const state = workflow(order);
  return state.finalInvoiceApproved && !state.financeQueued;
}

function isFreightQueueReady(order: ProductionOrder8S) {
  const state = workflow(order);
  return state.packingApproved && !state.freightQueued && freightPayloadComplete(order);
}

function isWhatsappReady(order: ProductionOrder8S) {
  return (order.documents ?? []).some((document) => {
    const type = String(document.documentType ?? '');
    return documentApproved(order, type) && Boolean(order.defaultWhatsappRecipient || latestShareUrl(order, type) || latestWhatsappLink(order, type));
  });
}

function blockingReasons(order: ProductionOrder8S) {
  const reasons = [...(order.blockerReasons ?? [])];
  if (order.lines.some((line) => line.status === 'needs_actual_lines')) reasons.push('Actual order lines are missing for at least one quoted line.');
  if (isFreightQueueReady(order) && !freightPayloadComplete(order)) reasons.push('Freight request payload is missing packing, pickup, delivery, shipment mode, or incoterm.');
  return [...new Set(reasons.filter(Boolean))];
}

function isBlocked(order: ProductionOrder8S) {
  return blockingReasons(order).length > 0;
}

function nextBestAction(order: ProductionOrder8S) {
  const state = workflow(order);
  const blockers = blockingReasons(order);
  if (blockers.length) {
    return {
      stageKey: 'actual_lines' as StageKey,
      label: 'Review order blockers',
      why: 'The order has source, line, or readiness issues that must be resolved before execution can move cleanly.',
      unlocks: 'Clean execution path and trustworthy next-stage approval.',
      blocks: blockers,
      truthLabels: ['Human review required', 'No automatic state change'],
    };
  }
  if (!state.actualApproved) {
    return {
      stageKey: 'actual_lines' as StageKey,
      label: 'Approve actual lines',
      why: 'Actual buyer order lines and any discount reasons must be approved before the first buyer document.',
      unlocks: 'Buyer Doc preparation and approval.',
      blocks: order.lines.length ? [] : ['No actual order lines are loaded.'],
      truthLabels: ['Accepted quote lineage preserved', 'Quote version lines stay immutable'],
    };
  }
  if (!state.buyerDocumentApproved) {
    return {
      stageKey: 'buyer_doc' as StageKey,
      label: `Approve ${documentLabel(state.buyerDocumentType)}`,
      why: 'The first buyer document confirms the actual order before packing and logistics work.',
      unlocks: 'Packing workspace.',
      blocks: [],
      truthLabels: ['Prepare -> Preview -> Approve -> Send tracked', 'Mailtrap email path'],
    };
  }
  if (!state.packingApproved) {
    return {
      stageKey: 'packing' as StageKey,
      label: 'Approve packing',
      why: 'Packing dimensions, cartons, pallets, weights, CBM, pickup, and destination are required before freight queueing.',
      unlocks: 'Freight Queue and Processing.',
      blocks: [],
      truthLabels: ['Human packing approval', 'Freight remains pending adapter'],
    };
  }
  if (!state.freightQueued) {
    return {
      stageKey: 'freight_queue' as StageKey,
      label: 'Queue freight request',
      why: 'The approved packing payload can be queued for manual/provider-later freight handling.',
      unlocks: 'Freight queue visibility and retry/manual reference tracking.',
      blocks: freightPayloadComplete(order) ? [] : ['Freight payload is missing packing metrics, pickup, delivery, shipment mode, or incoterm.'],
      truthLabels: ['Queue-ready only', "adapter_name='pending'", 'No live carrier booking'],
    };
  }
  if (!state.processingApproved) {
    return {
      stageKey: 'processing' as StageKey,
      label: 'Approve processing/QC',
      why: 'Pick, Pack, and QC must be complete before Delivery Note.',
      unlocks: 'Delivery Note approval.',
      blocks: [],
      truthLabels: ['Human QC gate', 'No automatic dispatch'],
    };
  }
  if (!state.deliveryApproved) {
    return {
      stageKey: 'delivery_note' as StageKey,
      label: 'Approve Delivery Note',
      why: 'Delivery Note approval is the execution gate before the final invoice.',
      unlocks: 'Final Invoice.',
      blocks: [],
      truthLabels: ['Document approval required', 'Manual tracked sends only'],
    };
  }
  if (!state.finalInvoiceApproved) {
    return {
      stageKey: 'final_invoice' as StageKey,
      label: 'Approve Final Invoice',
      why: 'Finance queueing and paid closeout remain locked until the final invoice is approved.',
      unlocks: 'Finance queue and paid closeout.',
      blocks: [],
      truthLabels: ['No live accounting sync', 'Human approval required'],
    };
  }
  if (!state.financeQueued) {
    return {
      stageKey: 'final_invoice' as StageKey,
      label: 'Queue invoice sync',
      why: 'The approved final invoice can be queued as a pending finance integration event for manual/provider-later processing.',
      unlocks: 'Finance queue visibility and retry/manual reference tracking.',
      blocks: [],
      truthLabels: ['Queue-ready only', "adapter_name='pending'", 'No Xero, QuickBooks, or Tally sync'],
    };
  }
  return {
    stageKey: 'paid_closed' as StageKey,
    label: 'Complete paid closeout',
    why: 'Payment reference, reconciliation, receipt acknowledgement, archive, and audit notes must be completed by a human.',
    unlocks: 'Order closeout.',
    blocks: [],
    truthLabels: ['Human closeout required', 'No silent close'],
  };
}

function draftFinancePayload(order: ProductionOrder8S) {
  const finalDocument = documentForType(order, 'dispatch_invoice');
  return {
    manual_review_required: true,
    adapter_name: 'pending',
    event_type: 'invoice_sync_requested',
    order_id: order.orderId ?? null,
    order_number: order.orderNumber ?? null,
    final_invoice_document_id: finalDocument?.id ?? null,
    final_invoice_document_type: 'dispatch_invoice',
    currency: order.currency,
    total: order.actualTotal ?? order.quotedTotal,
    buyer: { company_name: order.companyName, country: order.country },
    line_items_summary: order.lines.map((line) => ({
      product: line.productName,
      quantity: line.actualQuantity ?? line.quotedQuantity,
      unit_price: line.unitPrice,
      line_total: line.lineTotal,
      sku_code: line.skuCode,
      hsn_code: line.hsnCode,
    })),
    pdf_storage_path: finalDocument?.pdfStoragePath ?? null,
  };
}

function draftFreightPayload(order: ProductionOrder8S) {
  const metrics = packingMetrics(order);
  return {
    manual_review_required: true,
    adapter_name: 'pending',
    event_type: 'freight_quote_requested',
    order_id: order.orderId ?? null,
    order_number: order.orderNumber ?? null,
    origin: metrics.pickup || order.originPlace || null,
    destination: metrics.destination || order.destinationPlace || order.destinationPort || null,
    incoterm: order.freightRateRequest?.incoterm ?? order.incoterm ?? null,
    shipment_mode: order.freightRateRequest?.shipmentMode ?? 'manual_review',
    cartons: metrics.cartons,
    pallets: metrics.pallets,
    net_weight_kg: metrics.netWeightKg,
    gross_weight_kg: metrics.grossWeightKg,
    cbm: metrics.cbm,
    packing_document_reference: order.packingPlan?.id ?? null,
    freight_notes: metrics.freightNotes || null,
  };
}

function latestActivity(order: ProductionOrder8S) {
  const sendActivities = (order.documents ?? []).flatMap((document) => (document.sends ?? []).map((send) => ({
    id: send.id,
    label: `${documentLabel(String(document.documentType ?? 'document'))} ${send.channel ?? 'tracked'} link ${send.status ?? 'created'}`,
    at: send.sentAt ?? null,
  })));
  const queueActivities = [...(order.financeEvents ?? []), ...(order.freightEvents ?? [])].map((event) => ({
    id: event.id,
    label: `${titleCase(event.eventType)} - ${event.adapterName ?? 'pending'} / ${event.status ?? 'queued'}`,
    at: event.queuedAt ?? event.updatedAt ?? null,
  }));
  const stageActivities = (order.stageEvents ?? []).map((event) => ({
    id: event.id,
    label: event.summary ?? titleCase(event.eventType),
    at: event.createdAt ?? null,
  }));
  return [...stageActivities, ...queueActivities, ...sendActivities].slice(0, 5);
}

function CopyButton({ payload, onCopy, label = 'Copy payload' }: { payload: unknown; onCopy: (payload: unknown) => void; label?: string }) {
  return <button type="button" className="oc-btn ghost" onClick={() => onCopy(payload)}>{label}</button>;
}

function ActionButton({ children, tone = 'ghost', disabled = false, type = 'submit' }: { children: React.ReactNode; tone?: string; disabled?: boolean; type?: 'button' | 'submit' }) {
  return <button type={type} className={`oc-btn ${tone}`} disabled={disabled}>{children}</button>;
}

function GateForm({ action, quoteId, children, type, tone = 'ghost', disabled = false, onSubmit }: { action: ServerAction; quoteId: string; children: React.ReactNode; type?: string; tone?: string; disabled?: boolean; onSubmit?: () => void }) {
  return (
    <form action={action} onSubmit={onSubmit}>
      <input type="hidden" name="quote_id" value={quoteId} />
      {type ? <input type="hidden" name="document_gate_type" value={type} /> : null}
      <ActionButton tone={tone} disabled={disabled}>{children}</ActionButton>
    </form>
  );
}

function PreviewAction({ order, documentType, label, disabled = false, onRedirect }: { order: ProductionOrder8S; documentType: string; label: string; disabled?: boolean; onRedirect: (message: string) => void }) {
  const href = latestShareUrl(order, documentType);
  if (href) {
    return <a className={`oc-btn blue ${disabled ? 'disabled' : ''}`} href={disabled ? undefined : href} target="_blank" rel="noreferrer" onClick={() => onRedirect(`Opening ${label}...`)}>{label}</a>;
  }
  return (
    <form action={sendOrderDocumentLinkAction} target="_blank" onSubmit={() => onRedirect(`Creating tracked ${label.toLowerCase()}...`)}>
      <input type="hidden" name="order_id" value={order.orderId ?? ''} />
      <input type="hidden" name="quote_id" value={order.quoteId} />
      <input type="hidden" name="document_type" value={documentType} />
      <input type="hidden" name="channel" value="preview" />
      <input type="hidden" name="preview_only" value="true" />
      <ActionButton tone="blue" disabled={disabled}>{label}</ActionButton>
    </form>
  );
}

function PdfAction({ order, documentType, disabled = false, onRedirect }: { order: ProductionOrder8S; documentType: string; disabled?: boolean; onRedirect: (message: string) => void }) {
  const href = pdfHref(order, documentType);
  if (href) {
    return <a className={`oc-btn blue ${disabled ? 'disabled' : ''}`} href={disabled ? undefined : href} target="_blank" rel="noreferrer" onClick={() => onRedirect('Opening server PDF...')}>Generate PDF</a>;
  }
  return <PreviewAction order={order} documentType={documentType} label="Generate PDF" disabled={disabled} onRedirect={onRedirect} />;
}

function DocumentSendForm({ order, documentType, channel, disabled, onRedirect }: { order: ProductionOrder8S; documentType: string; channel: 'email' | 'whatsapp'; disabled: boolean; onRedirect: (message: string) => void }) {
  const recipient = channel === 'email' ? order.defaultEmailRecipient ?? '' : order.defaultWhatsappRecipient ?? '';
  const label = channel === 'email' ? 'Send Email' : 'Open WhatsApp manually';
  const docLabel = documentLabel(documentType);
  return (
    <form action={sendOrderDocumentLinkAction} target={channel === 'whatsapp' ? '_blank' : undefined} className={`send-form ${channel === 'email' ? 'email-send-form' : ''}`} onSubmit={() => onRedirect(channel === 'whatsapp' ? 'Opening WhatsApp with tracked link...' : 'Creating Mailtrap tracked email...')}>
      <input type="hidden" name="order_id" value={order.orderId ?? ''} />
      <input type="hidden" name="quote_id" value={order.quoteId} />
      <input type="hidden" name="document_type" value={documentType} />
      <input type="hidden" name="channel" value={channel} />
      <input type="hidden" name="recipient_role" value="buyer" />
      <label><span>{channel === 'email' ? 'Email recipient' : 'WhatsApp phone'}</span><input name="recipient" defaultValue={recipient} placeholder={channel === 'email' ? 'Buyer email' : 'WhatsApp phone'} disabled={disabled} /></label>
      {channel === 'email' ? <label className="span-2"><span>Message note sent with tracked link</span><textarea name="note" defaultValue={`Please review the ${docLabel}. The secure tracked document link is included below.`} disabled={disabled} /></label> : <p className="field-note span-2">WhatsApp opens manually with the tracked preview link. Operator reviews and sends; no Business API delivery is claimed.</p>}
      <ActionButton tone={channel === 'email' ? 'green' : 'teal'} disabled={disabled}>{label}</ActionButton>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'blue' }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function HiddenFreightFields({ order }: { order: ProductionOrder8S }) {
  const metrics = packingMetrics(order);
  return (
    <>
      <input type="hidden" name="shipment_mode" value={order.freightRateRequest?.shipmentMode ?? 'manual_review'} />
      <input type="hidden" name="incoterm" value={order.freightRateRequest?.incoterm ?? order.incoterm ?? ''} />
      <input type="hidden" name="pickup_address" value={metrics.pickup} />
      <input type="hidden" name="delivery_address" value={metrics.destination} />
      <input type="hidden" name="cartons" value={metrics.cartons} />
      <input type="hidden" name="pallets" value={metrics.pallets} />
      <input type="hidden" name="net_weight_kg" value={metrics.netWeightKg} />
      <input type="hidden" name="gross_weight_kg" value={metrics.grossWeightKg} />
      <input type="hidden" name="cbm" value={metrics.cbm} />
      <input type="hidden" name="freight_notes" value={metrics.freightNotes} />
    </>
  );
}

export function OrdersProductionWorkspace8S({ orders, catalogOptions = [] }: { orders: ProductionOrder8S[]; catalogOptions?: CatalogOrderOption8S[] }) {
  const searchParams = useSearchParams();
  const [kpiFilter, setKpiFilter] = useState<KpiFilter>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [stageFilter, setStageFilter] = useState<'all' | StageKey>('all');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(orders[0] ? orderKey(orders[0]) : '');
  const [selectedStage, setSelectedStage] = useState<StageKey | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const requestedOpenOrderId = searchParams.get('openOrderId');
  const requestedSourceQuoteId = searchParams.get('sourceQuoteId') ?? searchParams.get('quoteId');
  const notice = searchParams.get('notice');

  const markets = useMemo(() => {
    const values = orders.map((order) => clean(order.country)).filter(Boolean) as string[];
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const kpis = useMemo(() => [
    { key: 'all' as KpiFilter, icon: 'bar-chart', tone: 'value', label: 'All orders', count: orders.length, detail: 'Loaded execution orders' },
    { key: 'ready_now' as KpiFilter, icon: 'check-circle', tone: 'ready', label: 'Ready now', count: orders.filter((order) => nextBestAction(order).blocks.length === 0 && !isBlocked(order)).length, detail: 'No current blocker' },
    { key: 'blocked' as KpiFilter, icon: 'block', tone: 'blocked', label: 'Blocked', count: orders.filter(isBlocked).length, detail: 'Needs human review' },
    { key: 'finance_ready' as KpiFilter, icon: 'credit-card', tone: 'finance', label: 'Finance queue-ready', count: orders.filter(isFinanceQueueReady).length, detail: 'Final invoice approved' },
    { key: 'freight_ready' as KpiFilter, icon: 'truck', tone: 'freight', label: 'Freight queue-ready', count: orders.filter(isFreightQueueReady).length, detail: 'Packing payload approved' },
    { key: 'whatsapp_ready' as KpiFilter, icon: 'message', tone: 'whatsapp', label: 'WhatsApp-ready docs', count: orders.filter(isWhatsappReady).length, detail: 'Approved tracked link docs' },
  ], [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const haystack = `${order.companyName} ${order.orderNumber ?? ''} ${order.productContext ?? ''} ${order.country ?? ''}`.toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (typeFilter !== 'all' && order.orderType !== typeFilter) return false;
      if (stageFilter !== 'all' && inferredStageKey(order) !== stageFilter) return false;
      if (marketFilter !== 'all' && order.country !== marketFilter) return false;
      const readiness = readinessFilter === 'ready' ? !isBlocked(order) && nextBestAction(order).blocks.length === 0
        : readinessFilter === 'blocked' ? isBlocked(order)
          : readinessFilter === 'finance_ready' ? isFinanceQueueReady(order)
            : readinessFilter === 'freight_ready' ? isFreightQueueReady(order)
              : readinessFilter === 'whatsapp_ready' ? isWhatsappReady(order)
                : true;
      if (!readiness) return false;
      if (kpiFilter === 'ready_now' && (isBlocked(order) || nextBestAction(order).blocks.length > 0)) return false;
      if (kpiFilter === 'blocked' && !isBlocked(order)) return false;
      if (kpiFilter === 'finance_ready' && !isFinanceQueueReady(order)) return false;
      if (kpiFilter === 'freight_ready' && !isFreightQueueReady(order)) return false;
      if (kpiFilter === 'whatsapp_ready' && !isWhatsappReady(order)) return false;
      return true;
    });
  }, [orders, search, typeFilter, stageFilter, readinessFilter, marketFilter, kpiFilter]);

  const requested = useMemo(() => {
    return filteredOrders.find((candidate) => (requestedOpenOrderId && candidate.orderId === requestedOpenOrderId) || (requestedSourceQuoteId && candidate.quoteId === requestedSourceQuoteId));
  }, [filteredOrders, requestedOpenOrderId, requestedSourceQuoteId]);

  useEffect(() => {
    if (requested) {
      setSelectedId(orderKey(requested));
      setSelectedStage(null);
    }
  }, [requested?.orderId, requested?.quoteId]);

  useEffect(() => {
    if (!filteredOrders.length) return;
    if (!filteredOrders.some((order) => orderKey(order) === selectedId)) {
      setSelectedId(orderKey(filteredOrders[0]));
      setSelectedStage(null);
    }
  }, [filteredOrders, selectedId]);

  const activeOrder = filteredOrders.find((order) => orderKey(order) === selectedId) ?? filteredOrders[0] ?? null;
  const activeStage = activeOrder ? selectedStage ?? inferredStageKey(activeOrder) : 'actual_lines';
  const activeStageIndex = stageIndex(activeStage);

  function resetFilters() {
    setKpiFilter(null);
    setSearch('');
    setTypeFilter('all');
    setStageFilter('all');
    setReadinessFilter('all');
    setMarketFilter('all');
  }

  function copyPayload(payload: unknown) {
    const text = JSON.stringify(payload ?? {}, null, 2);
    navigator.clipboard?.writeText(text).then(() => setCopied('Payload copied')).catch(() => setCopied('Copy failed'));
    window.setTimeout(() => setCopied(null), 1800);
  }

  if (!orders.length) {
    return (
      <main className="oc-page">
        <section className="empty-shell">
          <span>Orders Execution Cockpit</span>
          <h1>No accepted-order workspaces yet</h1>
          <p>Orders appear here only after an accepted quote version creates an execution workspace. Finance and freight queues remain pending-adapter only.</p>
        </section>
        <style jsx global>{css}</style>
      </main>
    );
  }

  const next = activeOrder ? nextBestAction(activeOrder) : null;

  return (
    <main className="oc-page">
      {(notice || redirecting || copied) ? (
        <section className="oc-feedback">
          {notice ? <span>{titleCase(notice)}</span> : null}
          {redirecting ? <span>{redirecting}</span> : null}
          {copied ? <span>{copied}</span> : null}
        </section>
      ) : null}

      <section className="kpi-row" aria-label="Order KPI filters">
        {kpis.map((kpi) => {
          const active = kpiFilter === kpi.key || (!kpiFilter && kpi.key === 'all');
          return (
            <button key={kpi.label} className={`kpi-card ${kpi.tone} ${active ? 'active' : ''}`} onClick={() => setKpiFilter(active && kpi.key !== 'all' ? null : kpi.key === 'all' ? null : kpi.key)}>
              <span className="kpi-top"><em>{kpi.label}</em><i><OrdIcon k={kpi.icon} size={13} /></i></span>
              <strong>{kpi.count}</strong>
              <small>{kpi.detail}</small>
            </button>
          );
        })}
      </section>

      <section className="filter-bar">
        <label className="search-field">
          <span>Search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buyer, order number, market, product" />
        </label>
        <label>
          <span>Order type</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as OrderTypeFilter)}>
            <option value="all">All</option>
            <option value="export">Export</option>
            <option value="regional">Regional</option>
          </select>
        </label>
        <label>
          <span>Stage</span>
          <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as 'all' | StageKey)}>
            <option value="all">All stages</option>
            {STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
          </select>
        </label>
        <label>
          <span>Readiness</span>
          <select value={readinessFilter} onChange={(event) => setReadinessFilter(event.target.value as ReadinessFilter)}>
            <option value="all">All readiness</option>
            <option value="ready">Ready now</option>
            <option value="blocked">Blocked</option>
            <option value="finance_ready">Finance queue-ready</option>
            <option value="freight_ready">Freight queue-ready</option>
            <option value="whatsapp_ready">WhatsApp-ready docs</option>
          </select>
        </label>
        <label>
          <span>Market</span>
          <select value={marketFilter} onChange={(event) => setMarketFilter(event.target.value)}>
            <option value="all">All markets</option>
            {markets.map((market) => <option key={market} value={market}>{market}</option>)}
          </select>
        </label>
        <button className="oc-btn reset" type="button" onClick={resetFilters}>Reset filters</button>
      </section>

      <section className="cockpit-grid">
        <aside className="queue-panel">
          <div className="panel-head">
            <div>
              <span>Order queue</span>
              <strong>{filteredOrders.length} shown</strong>
            </div>
          </div>
          {filteredOrders.length ? (
            <div className="queue-list">
              {filteredOrders.map((order) => {
                const state = workflow(order);
                const progress = Math.round(((STAGES.filter((stage) => stageDone(order, stage.key)).length) / STAGES.length) * 100);
                const selected = activeOrder && orderKey(activeOrder) === orderKey(order);
                return (
                  <button key={orderKey(order)} className={`order-row ${selected ? 'selected' : ''}`} onClick={() => { setSelectedId(orderKey(order)); setSelectedStage(null); }}>
                    <span className="avatar">{initials(order.companyName)}</span>
                    <span className="row-main">
                      <b>{order.companyName}</b>
                      <small>{order.orderNumber ?? 'Order number pending'} / {titleCase(order.orderType)} / {order.country ?? 'Market not set'}</small>
                      <em>{order.productContext ?? 'Order products'}</em>
                      <span className="progress"><i style={{ width: `${progress}%` }} /></span>
                    </span>
                    <span className="row-side">
                      <strong>{money(order.actualTotal ?? order.quotedTotal, order.currency)}</strong>
                      <small>{STAGES[stageIndex(inferredStageKey(order))]?.label}</small>
                      <StatusPill tone={isBlocked(order) ? 'bad' : state.financeQueued || state.freightQueued ? 'warn' : 'good'}>{isBlocked(order) ? 'Blocked' : nextBestAction(order).blocks.length ? 'Needs input' : 'Ready'}</StatusPill>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-panel">
              <h3>No orders match these filters</h3>
              <p>Reset filters or choose a broader KPI. Counts are derived from loaded order data only.</p>
              <button className="oc-btn blue" type="button" onClick={resetFilters}>Reset filters</button>
            </div>
          )}
        </aside>

        {activeOrder ? (
          <>
            <section className="workspace-panel">
              <CockpitHeader order={activeOrder} />
              <nav className="stage-rail" aria-label="Order execution stages">
                {STAGES.map((stage, index) => {
                  const done = stageDone(activeOrder, stage.key);
                  const unlocked = stageUnlocked(activeOrder, stage.key);
                  const active = activeStage === stage.key;
                  const blocked = !unlocked;
                  return (
                    <button key={stage.key} className={`stage-pill ${active ? 'active' : ''} ${done ? 'done' : ''} ${blocked ? 'blocked' : ''}`} onClick={() => setSelectedStage(stage.key)}>
                      <span><em><OrdIcon k={stage.icon} size={12} /></em>{index + 1}</span>
                      <b>{stage.label}</b>
                      <small>{done ? 'Done' : active ? 'Active' : blocked ? 'Blocked' : 'Open'}</small>
                    </button>
                  );
                })}
              </nav>
              <StageWorkspace
                order={activeOrder}
                stageKey={activeStage}
                stageIndex={activeStageIndex}
                catalogOptions={catalogOptions}
                setDrawer={setDrawer}
                copyPayload={copyPayload}
                onRedirect={setRedirecting}
              />
            </section>
            <ActionStack order={activeOrder} next={next} setStage={setSelectedStage} />
          </>
        ) : (
          <section className="workspace-panel empty-workspace">
            <h2>No cockpit selected</h2>
            <p>The current filters returned no orders. Reset filters to return to the execution queue.</p>
          </section>
        )}
      </section>

      {drawer ? <QueueDrawer drawer={drawer} onClose={() => setDrawer(null)} onCopy={copyPayload} /> : null}
      <style jsx global>{css}</style>
    </main>
  );
}

function CockpitHeader({ order }: { order: ProductionOrder8S }) {
  const state = workflow(order);
  return (
    <article className="cockpit-title">
      <div>
        <span>{order.orderNumber ?? 'Order number pending'} / {titleCase(order.orderType)} / {order.country ?? 'Market not set'}</span>
        <h2>{order.companyName}</h2>
        <p>{order.productContext ?? 'Order products'} / {order.incoterm ?? 'Incoterm pending'} / {order.destinationPlace ?? order.destinationPort ?? 'Destination pending'}</p>
      </div>
      <div className="header-metrics">
        <Metric label="Value" value={money(order.actualTotal ?? order.quotedTotal, order.currency)} />
        <Metric label="Current stage" value={STAGES[stageIndex(inferredStageKey(order))]?.label ?? 'Actual Lines'} />
        <Metric label="Readiness" value={isBlocked(order) ? 'Blocked' : nextBestAction(order).blocks.length ? 'Needs input' : 'Ready now'} />
        <Metric label="Queues" value={`${state.financeQueued ? 'Finance queued' : 'Finance pending'} / ${state.freightQueued ? 'Freight queued' : 'Freight pending'}`} />
      </div>
    </article>
  );
}

function StageWorkspace({ order, stageKey, stageIndex, catalogOptions, setDrawer, copyPayload, onRedirect }: {
  order: ProductionOrder8S;
  stageKey: StageKey;
  stageIndex: number;
  catalogOptions: CatalogOrderOption8S[];
  setDrawer: (drawer: DrawerState) => void;
  copyPayload: (payload: unknown) => void;
  onRedirect: (message: string) => void;
}) {
  const blocker = stageBlocker(order, stageKey);
  if (blocker) {
    return (
      <article className="stage-card locked-card">
        <span>{STAGES[stageIndex]?.label ?? 'Stage'} locked</span>
        <h3>Approval gate required</h3>
        <p>{blocker}</p>
      </article>
    );
  }
  if (stageKey === 'actual_lines') return <ActualLinesStage order={order} catalogOptions={catalogOptions} />;
  if (stageKey === 'buyer_doc') return <BuyerDocStage order={order} onRedirect={onRedirect} />;
  if (stageKey === 'packing') return <PackingStage order={order} onRedirect={onRedirect} />;
  if (stageKey === 'freight_queue') return <FreightQueueStage order={order} setDrawer={setDrawer} copyPayload={copyPayload} />;
  if (stageKey === 'processing') return <ProcessingStage order={order} />;
  if (stageKey === 'delivery_note') return <DeliveryNoteStage order={order} onRedirect={onRedirect} />;
  if (stageKey === 'final_invoice') return <FinalInvoiceStage order={order} setDrawer={setDrawer} copyPayload={copyPayload} onRedirect={onRedirect} />;
  return <PaidClosedStage order={order} />;
}

function ActualLinesStage({ order, catalogOptions }: { order: ProductionOrder8S; catalogOptions: CatalogOrderOption8S[] }) {
  const actualApproved = workflow(order).actualApproved;
  return (
    <article className="stage-card actual-stage">
      <div className="stage-head">
        <div>
          <span>Accepted quote lineage preserved</span>
          <h3>Actual vs quoted buyer order lines</h3>
          <p>Review the buyer's actual order against the accepted quote. Save line edits and discount changes together; the accepted quote version remains immutable.</p>
        </div>
        <StatusPill tone={actualApproved ? 'good' : 'warn'}>{actualApproved ? 'Approved' : 'Approval required'}</StatusPill>
      </div>

      <div className="line-table">
        <div className="line-head"><span>Product</span><span>Quoted</span><span>Actual</span><span>Unit price</span><span>Total</span><span>Status</span></div>
        {order.lines.map((line) => (
          <div className="line-row" key={`summary-${line.id}`}>
            <span><b>{line.productName}</b><small>{line.skuCode ?? line.hsnCode ?? line.variantName ?? 'Line context pending'}</small></span>
            <span>{line.quotedQuantity ?? 'NA'} {line.unitOfMeasure ?? ''}</span>
            <span>{line.actualQuantity ?? 'Needs actual'}</span>
            <span>{money(line.unitPrice, line.currency)}</span>
            <span>{money(line.lineTotal, line.currency)}</span>
            <StatusPill tone={line.status === 'unchanged' ? 'good' : line.status === 'needs_actual_lines' ? 'bad' : 'warn'}>{titleCase(line.status)}</StatusPill>
          </div>
        ))}
      </div>

      <div className="editor-list">
        {order.lines.map((line) => (
          <div className="line-editor" key={line.id}>
            <form action={updateActualOrderLineAction} className="line-form">
              <input type="hidden" name="quote_id" value={order.quoteId} />
              <input type="hidden" name="order_line_id" value={line.id} />
              <div className="line-editor-title">
                <b>{line.productName}</b>
                <small>{line.skuCode ?? line.hsnCode ?? line.variantName ?? 'Catalog / SKU context pending'}</small>
              </div>
              <label><span>Actual qty</span><input name="ordered_quantity" defaultValue={lineQty(line)} disabled={!line.isActual} /></label>
              <label><span>Unit price</span><input name="unit_price" defaultValue={line.unitPrice ?? ''} disabled={!line.isActual} /></label>
              <label className="span-2"><span>Reason / context</span><input name="change_reason" defaultValue={line.reason ?? 'Actual buyer order review.'} disabled={!line.isActual} /></label>
              <label><span>Line discount</span><select name="line_discount_type" defaultValue={line.lineDiscountType ?? 'none'} disabled={!line.isActual}><option value="none">No discount</option><option value="percent">Percent</option><option value="amount">Amount</option></select></label>
              <label><span>Discount value</span><input name="line_discount_value" defaultValue={line.lineDiscountValue ?? ''} disabled={!line.isActual} /></label>
              <label className="span-2"><span>Discount reason</span><input name="line_discount_reason" defaultValue={line.lineDiscountReason ?? ''} disabled={!line.isActual} placeholder="Required when discount is applied" /></label>
              <div className="line-actions">
                <ActionButton tone="blue" disabled={!line.isActual}>Save line + discount</ActionButton>
              </div>
            </form>
            <form action={removeActualOrderLineAction} className="remove-form">
              <input type="hidden" name="quote_id" value={order.quoteId} />
              <input type="hidden" name="order_line_id" value={line.id} />
              <input type="hidden" name="change_reason" value="Buyer did not include this quoted line in the actual order." />
              <ActionButton tone="danger" disabled={!line.isActual}>Remove line</ActionButton>
            </form>
          </div>
        ))}
      </div>

      <div className="split-panel">
        <form action={addManualActualOrderLineAction} className="control-grid add-line-card">
          <input type="hidden" name="quote_id" value={order.quoteId} />
          <label className="span-2"><span>Add catalog product</span><select name="catalog_pricing_rule_id"><option value="">Manual / choose catalog product</option>{catalogOptions.slice(0, 160).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          {!catalogOptions.length ? <p className="field-note span-2">No quoteable catalog options were returned for this organization. Use manual product fields now; catalog mapping can be repaired separately.</p> : null}
          <label><span>Manual product</span><input name="product_name" placeholder="Product name if catalog is blank" /></label>
          <label><span>SKU / code</span><input name="sku_code" placeholder="Optional" /></label>
          <label><span>Qty</span><input name="ordered_quantity" placeholder="Quantity" /></label>
          <label><span>Unit price</span><input name="unit_price" placeholder="Required for manual line" /></label>
          <label><span>Currency</span><input name="currency" defaultValue={order.currency ?? 'USD'} /></label>
          <label><span>HSN / HS code</span><input name="hsn_code" placeholder="Optional" /></label>
          <label className="span-2"><span>Reason/context</span><input name="change_reason" placeholder="Why this line is being added" /></label>
          <ActionButton tone="blue">Add line</ActionButton>
        </form>
        <form action={saveOrderDiscountAction} className="control-grid">
          <input type="hidden" name="quote_id" value={order.quoteId} />
          <label><span>Total discount</span><select name="order_discount_type" defaultValue={order.orderDiscountType ?? 'none'}><option value="none">No total discount</option><option value="percent">Percent</option><option value="amount">Amount</option></select></label>
          <label><span>Discount value</span><input name="order_discount_value" defaultValue={order.orderDiscountValue ?? ''} /></label>
          <label className="span-2"><span>Discount reason</span><input name="order_discount_reason" defaultValue={order.orderDiscountReason ?? ''} placeholder="Why this total order discount is allowed" /></label>
          <ActionButton>Save total order discount</ActionButton>
        </form>
      </div>
      <div className="cta-row approve-row">
        <GateForm action={approveActualOrderLinesGateAction} quoteId={order.quoteId} tone="green">Approve actual lines</GateForm>
        <span className="approval-note">Human approval unlocks Buyer Doc. No quote version lines are changed.</span>
      </div>
    </article>
  );
}

function BuyerDocStage({ order, onRedirect }: { order: ProductionOrder8S; onRedirect: (message: string) => void }) {
  const documentType = documentTypeForBuyer(order);
  const approved = documentApproved(order, documentType);
  return (
    <article className="stage-card">
      <div className="stage-head">
        <div>
          <span>{order.orderType === 'export' ? 'Export buyer document' : 'Regional buyer document'}</span>
          <h3>{documentLabel(documentType)}</h3>
          <p>Document flow is Prepare, Preview, Approve, then Send tracked. Sending remains locked until approval.</p>
        </div>
        <StatusPill tone={approved ? 'good' : 'warn'}>{approved ? 'Approved' : 'Send locked'}</StatusPill>
      </div>
      <div className="cta-row">
        <GateForm action={prepareFirstDocumentGateAction} quoteId={order.quoteId} type={documentType}>Prepare</GateForm>
        <PreviewAction order={order} documentType={documentType} label="Preview" onRedirect={onRedirect} />
        <PdfAction order={order} documentType={documentType} onRedirect={onRedirect} />
        <GateForm action={approveFirstDocumentGateAction} quoteId={order.quoteId} type={documentType} tone="green">Approve</GateForm>
      </div>
      <div className="send-stack">
        <DocumentSendForm order={order} documentType={documentType} channel="email" disabled={!approved} onRedirect={onRedirect} />
        <DocumentSendForm order={order} documentType={documentType} channel="whatsapp" disabled={!approved} onRedirect={onRedirect} />
      </div>
      <DocumentTray order={order} preferredType={documentType} onRedirect={onRedirect} />
    </article>
  );
}

function PackingStage({ order, onRedirect }: { order: ProductionOrder8S; onRedirect: (message: string) => void }) {
  const metrics = packingMetrics(order);
  const documentType = order.orderType === 'export' ? 'packing_list' : 'packing_sheet';
  const state = workflow(order);
  return (
    <article className="stage-card">
      <div className="stage-head">
        <div>
          <span>Packing plan</span>
          <h3>Cartons, pallets, CBM, weights, pickup, destination</h3>
          <p>Freight remains locked until this packing plan is saved and human-approved.</p>
        </div>
        <StatusPill tone={state.packingApproved ? 'good' : 'warn'}>{state.packingApproved ? 'Packing approved' : 'Freight locked'}</StatusPill>
      </div>
      <div className="metric-grid">
        <Metric label="Units" value={metrics.units} />
        <Metric label="Cartons" value={metrics.cartons} />
        <Metric label="Pallets" value={metrics.pallets} />
        <Metric label="Net kg" value={metrics.netWeightKg} />
        <Metric label="Gross kg" value={metrics.grossWeightKg} />
        <Metric label="CBM" value={metrics.cbm} />
      </div>
      <form action={savePackingOverridesAction} className="control-grid wide">
        <input type="hidden" name="quote_id" value={order.quoteId} />
        <label><span>Cartons</span><input name="cartons" defaultValue={metrics.cartons} /></label>
        <label><span>Pallets</span><input name="pallets" defaultValue={metrics.pallets} /></label>
        <label><span>Net weight kg</span><input name="net_weight_kg" defaultValue={metrics.netWeightKg} /></label>
        <label><span>Gross weight kg</span><input name="gross_weight_kg" defaultValue={metrics.grossWeightKg} /></label>
        <label><span>CBM</span><input name="cbm" defaultValue={metrics.cbm} /></label>
        <label><span>Dimensions</span><input name="dimensions" defaultValue={metrics.dimensions} placeholder="L x W x H / notes" /></label>
        <label><span>Pickup</span><input name="pickup" defaultValue={metrics.pickup} /></label>
        <label><span>Destination</span><input name="delivery_destination" defaultValue={metrics.destination} /></label>
        <label className="span-2"><span>Freight notes</span><input name="freight_notes" defaultValue={metrics.freightNotes} /></label>
        <ActionButton>Save packing overrides</ActionButton>
      </form>
      <div className="cta-row">
        <GateForm action={approvePackingOverridesAction} quoteId={order.quoteId} tone="green">Approve packing</GateForm>
        <PreviewAction order={order} documentType={documentType} label="Preview packing list/sheet" onRedirect={onRedirect} />
      </div>
    </article>
  );
}

function FreightQueueStage({ order, setDrawer, copyPayload }: { order: ProductionOrder8S; setDrawer: (drawer: DrawerState) => void; copyPayload: (payload: unknown) => void }) {
  const state = workflow(order);
  const payload = draftFreightPayload(order);
  const ready = isFreightQueueReady(order);
  const latestEvent = (order.freightEvents ?? [])[0];
  const label = state.freightQueued ? 'Pending adapter' : ready ? 'Queue-ready' : 'Not ready';
  return (
    <article className="stage-card">
      <div className="stage-head">
        <div>
          <span>Freight integration-ready queue</span>
          <h3>Queue freight request</h3>
          <p>No live carrier booking is active. Queueing writes a pending freight event for manual/provider-later processing.</p>
        </div>
        <StatusPill tone={state.freightQueued ? 'warn' : ready ? 'good' : 'bad'}>{label}</StatusPill>
      </div>
      <div className="truth-list">
        <span>adapter_name='pending'</span>
        <span>event_type='freight_quote_requested'</span>
        <span>No Flexport, Freightos, DHL, or carrier booking call</span>
      </div>
      {!ready && !state.freightQueued ? <p className="blocker-text">Missing before freight request: approved packing plan plus cartons, pallets, net/gross weight, CBM, pickup, delivery, shipment mode, and incoterm.</p> : null}
      <div className="cta-row">
        <form action={queueFreightBookingEventAction}>
          <input type="hidden" name="quote_id" value={order.quoteId} />
          <HiddenFreightFields order={order} />
          <ActionButton tone="green" disabled={!ready || state.freightQueued}>Queue freight request</ActionButton>
        </form>
        <button type="button" className="oc-btn blue" onClick={() => setDrawer({ type: 'freight', order })}>View queue</button>
        <CopyButton payload={payload} onCopy={copyPayload} />
        {latestEvent ? (
          <form action={retryPendingQueueEventAction}>
            <input type="hidden" name="quote_id" value={order.quoteId} />
            <input type="hidden" name="queue_type" value="freight" />
            <input type="hidden" name="event_id" value={latestEvent.id} />
            <ActionButton>Retry queued event</ActionButton>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function ProcessingStage({ order }: { order: ProductionOrder8S }) {
  const check = order.processingCheck;
  return (
    <article className="stage-card">
      <div className="stage-head">
        <div>
          <span>Processing checks</span>
          <h3>Pick / Pack / QC</h3>
          <p>Save checks as work progresses. The gate approves only when pick, pack, and QC are all confirmed.</p>
        </div>
        <StatusPill tone={workflow(order).processingApproved ? 'good' : 'warn'}>{workflow(order).processingApproved ? 'Processing approved' : 'QC pending'}</StatusPill>
      </div>
      <form action={saveProcessingCheckAction} className="check-form">
        <input type="hidden" name="quote_id" value={order.quoteId} />
        <label><input type="checkbox" name="picked" defaultChecked={Boolean(check?.picked)} /> Pick complete</label>
        <label><input type="checkbox" name="packed" defaultChecked={Boolean(check?.packed)} /> Pack complete</label>
        <label><input type="checkbox" name="qc_passed" defaultChecked={Boolean(check?.qcPassed)} /> QC passed</label>
        <input name="processing_note" defaultValue={check?.note ?? ''} placeholder="Processing/QC note" />
        <ActionButton>Save processing check</ActionButton>
        <ActionButton tone="green">Approve processing/QC</ActionButton>
      </form>
      <p className="note-text">This does not mark the order dispatched or delivered.</p>
    </article>
  );
}

function DeliveryNoteStage({ order, onRedirect }: { order: ProductionOrder8S; onRedirect: (message: string) => void }) {
  const documentType = 'delivery_note';
  const approved = documentApproved(order, documentType);
  return (
    <article className="stage-card">
      <div className="stage-head">
        <div>
          <span>Dispatch document gate</span>
          <h3>Delivery Note</h3>
          <p>Delivery Note can be sent only after human approval. WhatsApp remains manual tracked link.</p>
        </div>
        <StatusPill tone={approved ? 'good' : 'warn'}>{approved ? 'Approved' : 'Send locked'}</StatusPill>
      </div>
      <div className="cta-row">
        <PreviewAction order={order} documentType={documentType} label="Preview" onRedirect={onRedirect} />
        <PdfAction order={order} documentType={documentType} onRedirect={onRedirect} />
        <form action={approveDeliveryNoteAction} className="inline-form">
          <input type="hidden" name="quote_id" value={order.quoteId} />
          <input name="delivery_reference" placeholder="Delivery reference" />
          <ActionButton tone="green">Approve Delivery Note</ActionButton>
        </form>
      </div>
      <div className="send-stack">
        <DocumentSendForm order={order} documentType={documentType} channel="email" disabled={!approved} onRedirect={onRedirect} />
        <DocumentSendForm order={order} documentType={documentType} channel="whatsapp" disabled={!approved} onRedirect={onRedirect} />
      </div>
      <DocumentTray order={order} preferredType={documentType} onRedirect={onRedirect} />
    </article>
  );
}

function FinalInvoiceStage({ order, setDrawer, copyPayload, onRedirect }: { order: ProductionOrder8S; setDrawer: (drawer: DrawerState) => void; copyPayload: (payload: unknown) => void; onRedirect: (message: string) => void }) {
  const documentType = 'dispatch_invoice';
  const state = workflow(order);
  const payload = draftFinancePayload(order);
  const latestEvent = (order.financeEvents ?? [])[0];
  return (
    <article className="stage-card">
      <div className="stage-head">
        <div>
          <span>Finance integration-ready queue</span>
          <h3>Final Invoice</h3>
          <p>Finance queueing remains pending-adapter only. No Xero, QuickBooks, Tally, bank feed, or payment processor sync is live.</p>
        </div>
        <StatusPill tone={state.financeQueued ? 'warn' : state.finalInvoiceApproved ? 'good' : 'bad'}>{state.financeQueued ? 'Pending adapter' : state.finalInvoiceApproved ? 'Finance queue-ready' : 'Finance locked'}</StatusPill>
      </div>
      <div className="cta-row">
        <GateForm action={prepareFinalInvoiceGateAction} quoteId={order.quoteId}>Prepare final invoice</GateForm>
        <GateForm action={previewFinalInvoiceGateAction} quoteId={order.quoteId}>Preview gate</GateForm>
        <PreviewAction order={order} documentType={documentType} label="Preview" onRedirect={onRedirect} />
        <PdfAction order={order} documentType={documentType} onRedirect={onRedirect} />
        <GateForm action={approveFinalInvoiceGateAction} quoteId={order.quoteId} tone="green">Approve Final Invoice</GateForm>
      </div>
      <div className="send-stack">
        <DocumentSendForm order={order} documentType={documentType} channel="email" disabled={!state.finalInvoiceApproved} onRedirect={onRedirect} />
        <DocumentSendForm order={order} documentType={documentType} channel="whatsapp" disabled={!state.finalInvoiceApproved} onRedirect={onRedirect} />
      </div>
      <div className="queue-actions">
        <form action={queueFinanceIntegrationEventAction}>
          <input type="hidden" name="quote_id" value={order.quoteId} />
          <ActionButton tone="green" disabled={!state.finalInvoiceApproved || state.financeQueued}>Queue invoice sync</ActionButton>
        </form>
        <button type="button" className="oc-btn blue" onClick={() => setDrawer({ type: 'finance', order })}>View queue</button>
        <CopyButton payload={payload} onCopy={copyPayload} />
        {latestEvent ? (
          <form action={retryPendingQueueEventAction}>
            <input type="hidden" name="quote_id" value={order.quoteId} />
            <input type="hidden" name="queue_type" value="finance" />
            <input type="hidden" name="event_id" value={latestEvent.id} />
            <ActionButton>Retry queued event</ActionButton>
          </form>
        ) : null}
      </div>
      <DocumentTray order={order} preferredType={documentType} onRedirect={onRedirect} />
    </article>
  );
}

function PaidClosedStage({ order }: { order: ProductionOrder8S }) {
  const state = workflow(order);
  const locked = !state.finalInvoiceApproved || isBlocked(order);
  return (
    <article className="stage-card">
      <div className="stage-head">
        <div>
          <span>Payment and archive closeout</span>
          <h3>Paid & Closed</h3>
          <p>Close order only after delivery/final invoice approval, payment reference, reconciliation, archive, and no open blockers.</p>
        </div>
        <StatusPill tone={state.paidClosed ? 'good' : locked ? 'bad' : 'warn'}>{state.paidClosed ? 'Closed' : locked ? 'Close locked' : 'Human closeout required'}</StatusPill>
      </div>
      <form action={closeOrderAction} className="closeout-form" onSubmit={(event) => { if (!window.confirm('Close this order only if payment, reconciliation, archive, and blockers are complete. Continue?')) event.preventDefault(); }}>
        <input type="hidden" name="quote_id" value={order.quoteId} />
        <label><span>Record payment reference</span><input name="payment_reference" defaultValue={clean(order.closeout?.payment_reference) ?? ''} placeholder="Bank ref, UTR, cheque, receipt ID" /></label>
        <label><input type="checkbox" name="payment_received" defaultChecked={Boolean(order.closeout?.payment_received)} /> Payment received</label>
        <label><span>Upload receipt if supported</span><input type="file" disabled /></label>
        <label><span>Reconcile</span><select name="reconciliation_status" defaultValue={clean(order.closeout?.reconciliation_status) ?? 'pending'}><option value="pending">Pending</option><option value="reconciled">Reconciled</option></select></label>
        <label><span>Outstanding amount</span><input name="outstanding_amount" defaultValue={String(order.closeout?.outstanding_amount ?? '0')} /></label>
        <label><input type="checkbox" name="receipt_acknowledged" defaultChecked={Boolean(order.closeout?.receipt_acknowledged)} /> Receipt acknowledged</label>
        <label><input type="checkbox" name="documents_archived" defaultChecked={Boolean(order.closeout?.documents_archived)} /> Archive documents</label>
        <textarea name="activity_note" defaultValue={clean(order.closeout?.activity_note) ?? ''} placeholder="Closeout audit note" />
        <ActionButton tone="green" disabled={locked}>Close order</ActionButton>
      </form>
    </article>
  );
}

function DocumentTray({ order, preferredType, onRedirect }: { order: ProductionOrder8S; preferredType: string; onRedirect: (message: string) => void }) {
  const docs = (order.documents ?? []).length ? order.documents ?? [] : [{ id: 'planned', documentType: preferredType, status: 'planned', sends: [] }];
  return (
    <section className="document-tray">
      <div className="panel-head"><span>Document activity</span><strong>{docs.length}</strong></div>
      {docs.map((document) => {
        const type = String(document.documentType ?? preferredType);
        return (
          <div className="document-row" key={document.id}>
            <div><b>{documentLabel(type)}</b><small>{titleCase(document.status)} / PDF storage: {document.pdfStoragePath ? 'available' : 'not generated'}</small></div>
            <PreviewAction order={order} documentType={type} label="Preview tracked link" onRedirect={onRedirect} />
            {(document.sends ?? []).slice(0, 3).map((send) => {
              const href = normalizeUrl(send.shareUrl);
              return <p key={send.id}>{titleCase(send.channel)} / {titleCase(send.status)} {href ? <a href={href} target="_blank" rel="noreferrer">Open tracked link</a> : null}</p>;
            })}
          </div>
        );
      })}
    </section>
  );
}

function ActionStack({ order, next, setStage }: { order: ProductionOrder8S; next: ReturnType<typeof nextBestAction> | null; setStage: (stage: StageKey) => void }) {
  const activities = latestActivity(order);
  return (
    <aside className="action-stack">
      <div className="panel-head">
        <div><span>Action Stack</span><strong>Next best action</strong></div>
      </div>
      {next ? (
        <>
          <section className="next-card">
            <span>Next best action</span>
            <h3>{next.label}</h3>
            <p>{next.why}</p>
            <button type="button" className="oc-btn green full" onClick={() => setStage(next.stageKey)}>{next.label}</button>
          </section>
          <section className="stack-section">
            <b>What it unlocks</b>
            <p>{next.unlocks}</p>
          </section>
          <section className="stack-section">
            <b>What blocks it</b>
            {next.blocks.length ? <ul>{next.blocks.map((block) => <li key={block}>{block}</li>)}</ul> : <p>No blocker in loaded data.</p>}
          </section>
          <section className="stack-section">
            <b>Truth labels</b>
            <div className="truth-list compact">{next.truthLabels.map((label) => <span key={label}>{label}</span>)}</div>
          </section>
        </>
      ) : null}
      <section className="stack-section">
        <b>Latest activity/events</b>
        {activities.length ? activities.map((activity) => (
          <p key={activity.id}><span>{activity.label}</span><small>{activity.at ? activity.at.slice(0, 16).replace('T', ' ') : 'Time not available'}</small></p>
        )) : <p>No activity loaded yet.</p>}
      </section>
    </aside>
  );
}

function QueueDrawer({ drawer, onClose, onCopy }: { drawer: { type: 'finance' | 'freight'; order: ProductionOrder8S }; onClose: () => void; onCopy: (payload: unknown) => void }) {
  const { type, order } = drawer;
  const events = type === 'finance' ? order.financeEvents ?? [] : order.freightEvents ?? [];
  const draft = type === 'finance' ? draftFinancePayload(order) : draftFreightPayload(order);
  return (
    <div className="drawer-backdrop" role="dialog" aria-modal="true">
      <aside className="queue-drawer">
        <div className="drawer-head">
          <div>
            <span>{type === 'finance' ? 'Finance queue' : 'Freight queue'}</span>
            <h3>{order.orderNumber ?? order.orderId ?? 'Order'}</h3>
            <p>Pending adapter queue detail. This drawer does not claim provider sync or booking.</p>
          </div>
          <button type="button" className="oc-btn ghost" onClick={onClose}>Close</button>
        </div>
        <div className="drawer-truth">
          <StatusPill tone="warn">adapter_name='pending'</StatusPill>
          <StatusPill tone="blue">{type === 'finance' ? 'invoice_sync_requested' : 'freight_quote_requested'}</StatusPill>
          <StatusPill tone="neutral">Manual/provider-later</StatusPill>
        </div>
        {events.length ? events.map((event) => (
          <section className="event-card" key={event.id}>
            <div className="event-meta">
              <Metric label="Event type" value={event.eventType ?? 'Not available'} />
              <Metric label="Queue status" value={event.status ?? 'Not available'} />
              <Metric label="Order ID" value={order.orderId ?? 'Not available'} />
              <Metric label="Document/request ID" value={type === 'finance' ? event.orderDocumentId ?? 'Not available' : event.freightRateRequestId ?? 'Not available'} />
              <Metric label="Retry count/status" value={`${event.retryCount ?? 0} / ${event.status ?? 'queued'}`} />
              <Metric label="Last error" value={event.errorMessage ?? 'None'} />
            </div>
            <pre>{JSON.stringify(event.payload ?? {}, null, 2)}</pre>
            <div className="cta-row">
              <CopyButton payload={event.payload ?? {}} onCopy={onCopy} />
              <form action={retryPendingQueueEventAction}>
                <input type="hidden" name="quote_id" value={order.quoteId} />
                <input type="hidden" name="queue_type" value={type} />
                <input type="hidden" name="event_id" value={event.id} />
                <ActionButton>Retry queued event</ActionButton>
              </form>
              <form action={markQueueEventManuallyCompletedAction} className="inline-form">
                <input type="hidden" name="quote_id" value={order.quoteId} />
                <input type="hidden" name="queue_type" value={type} />
                <input type="hidden" name="event_id" value={event.id} />
                <input name="manual_reference" placeholder={type === 'finance' ? 'Manual finance ref' : 'Manual freight ref'} />
                <ActionButton tone="green">Mark manually completed</ActionButton>
              </form>
            </div>
          </section>
        )) : (
          <section className="event-card">
            <h4>No queued event yet</h4>
            <p>The payload below is a readiness preview from loaded order data. Queue actions write a pending adapter event only.</p>
            <pre>{JSON.stringify(draft, null, 2)}</pre>
            <CopyButton payload={draft} onCopy={onCopy} />
          </section>
        )}
      </aside>
    </div>
  );
}

const css = `
.oc-page{min-height:100vh;background:#f4f8fb;color:#102033;padding:22px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.filter-bar,.queue-panel,.workspace-panel,.action-stack,.stage-card,.cockpit-title,.empty-shell,.oc-feedback{background:#fff;border:1px solid #dbe6ef;border-radius:22px;box-shadow:0 18px 42px rgba(15,23,42,.08)}
.oc-header{display:none}.oc-feedback{display:flex;gap:10px;flex-wrap:wrap;padding:10px 14px;margin-bottom:14px;color:#0f766e;font-weight:800}
.kpi-row{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin-bottom:16px}.kpi-card{border:1px solid #dbe6ef;background:#fff;border-radius:22px;padding:15px;text-align:left;box-shadow:0 18px 42px rgba(15,23,42,.07);cursor:pointer;min-height:112px;display:grid;gap:8px;transition:.16s ease}.kpi-card:hover{transform:translateY(-2px);border-color:#93c5fd}.kpi-card.active{border-color:#0c7fff;box-shadow:0 0 0 3px rgba(12,127,255,.13),0 18px 42px rgba(15,23,42,.08);background:#eff6ff}.kpi-top{display:flex!important;justify-content:space-between;align-items:center;gap:10px;font-size:10px;font-weight:1000;text-transform:uppercase;letter-spacing:.12em;color:#607080}.kpi-top em{font-style:normal;line-height:1.2}.kpi-top i{width:34px;height:34px;border-radius:14px;display:grid;place-items:center;font-style:normal;font-size:18px;background:#f1f5f9}.kpi-card.ready .kpi-top i{background:#dcfce7;color:#047857}.kpi-card.blocked .kpi-top i{background:#fee2e2;color:#b91c1c}.kpi-card.finance .kpi-top i{background:#e8f3ff;color:#1d4ed8}.kpi-card.freight .kpi-top i{background:#ecfeff;color:#0891b2}.kpi-card.whatsapp .kpi-top i{background:#dcfce7;color:#16a34a}.kpi-card.value .kpi-top i{background:#fef3c7;color:#92400e}.kpi-card strong{display:block;font-size:30px;color:#082f49;margin:0;letter-spacing:-.05em}.kpi-card small{color:#64748b;font-weight:800}
.filter-bar{display:grid;grid-template-columns:2fr 1fr 1fr 1.2fr 1fr auto;gap:10px;padding:14px;margin-bottom:14px;align-items:end}.filter-bar label,.line-form label,.control-grid label,.closeout-form label,.send-form label{display:grid;gap:5px}.filter-bar label span,.line-form label span,.control-grid label span,.closeout-form label span,.send-form label span{font-size:10px;text-transform:uppercase;font-weight:900;letter-spacing:.12em;color:#607080}.filter-bar input,.filter-bar select,.line-form input,.line-form select,.control-grid input,.control-grid select,.send-form input,.send-form textarea,.inline-form input,.check-form input,.closeout-form input,.closeout-form select,.closeout-form textarea{border:1px solid #cfddd8;border-radius:14px;padding:10px 12px;background:#fff;color:#102033;min-width:0;outline:none}.filter-bar input:focus,.filter-bar select:focus,.line-form input:focus,.line-form select:focus,.control-grid input:focus,.control-grid select:focus,.send-form input:focus,.send-form textarea:focus{border-color:#0c7fff;box-shadow:0 0 0 3px rgba(12,127,255,.1)}
.cockpit-grid{display:grid;grid-template-columns:360px minmax(0,1fr) 330px;gap:14px;align-items:start}.queue-panel,.workspace-panel,.action-stack{padding:14px}.panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.panel-head strong{display:block;color:#102033}.queue-list{display:grid;gap:10px;max-height:calc(100vh - 285px);overflow:auto;padding-right:3px}.order-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:10px;align-items:start;width:100%;border:1px solid #e4ece9;background:#fff;border-radius:18px;padding:12px;text-align:left;cursor:pointer;transition:.16s ease}.order-row:hover{border-color:#93c5fd;background:#f8fbff}.order-row.selected{border-color:#0f766e;background:#f0fdfa;box-shadow:0 0 0 3px rgba(15,118,110,.12)}.avatar{width:42px;height:42px;border-radius:14px;background:#155e75;color:#fff;display:grid;place-items:center;font-weight:900}.row-main{display:grid;gap:3px;min-width:0}.row-main b,.row-main small,.row-main em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row-main small,.row-main em,.row-side small{color:#64748b;font-style:normal;font-size:12px}.row-side{display:grid;gap:5px;justify-items:end}.row-side strong{font-size:12px;color:#102033}.progress{height:6px;background:#e7efec;border-radius:999px;overflow:hidden}.progress i{display:block;height:100%;background:linear-gradient(90deg,#0f766e,#2563eb)}
.cockpit-title{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,430px);gap:14px;padding:16px;margin-bottom:12px}.cockpit-title h2,.stage-card h3,.next-card h3,.empty-shell h1{margin:4px 0;color:#102033;letter-spacing:-.02em}.cockpit-title p,.stage-card p,.next-card p,.empty-panel p,.empty-shell p,.stack-section p{margin:4px 0;color:#64748b;line-height:1.45}.cockpit-title span,.stage-head span,.panel-head span,.metric span,.next-card span,.empty-shell span{font-size:11px;text-transform:uppercase;font-weight:800;letter-spacing:.04em;color:#607080}.header-metrics{display:grid;grid-template-columns:repeat(2,minmax(120px,1fr));gap:8px}.metric{border:1px solid #e2eae7;background:#f8fbfa;border-radius:16px;padding:10px}.metric strong{display:block;color:#102033;margin-top:4px}
.stage-rail{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-bottom:12px}.stage-pill{border:1px solid #d8e5e1;background:#fff;border-radius:16px;padding:10px 9px;display:grid;gap:5px;text-align:left;min-height:86px;cursor:pointer;transition:.16s ease}.stage-pill:hover{border-color:#93c5fd}.stage-pill span{display:flex;align-items:center;gap:6px;font-weight:900;color:#47616c}.stage-pill span em{width:24px;height:24px;border-radius:999px;background:#e7efec;display:grid;place-items:center;font-style:normal;font-size:14px}.stage-pill b{font-size:12px;color:#102033}.stage-pill small{font-size:11px;color:#64748b}.stage-pill.active{border-color:#2563eb;background:#eff6ff}.stage-pill.done{border-color:#16a34a;background:#f0fdf4}.stage-pill.blocked{border-color:#f59e0b;background:#fff7ed}
.stage-card{padding:18px}.stage-head{display:flex;justify-content:space-between;gap:14px;margin-bottom:14px}.pill{display:inline-flex;align-items:center;justify-content:center;border:1px solid #d8e5e1;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900;white-space:nowrap}.pill.good{background:#ecfdf5;color:#047857;border-color:#bbf7d0}.pill.warn{background:#fffbeb;color:#92400e;border-color:#fde68a}.pill.bad{background:#fef2f2;color:#b91c1c;border-color:#fecaca}.pill.blue{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.oc-btn{border:1px solid #cfddd8;background:#fff;border-radius:14px;padding:10px 14px;font-weight:900;color:#17425b;text-decoration:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:40px;transition:.16s ease}.oc-btn:hover{background:#f8fbfa;transform:translateY(-1px)}.oc-btn:disabled,.oc-btn.disabled{opacity:.45;cursor:not-allowed;pointer-events:none;transform:none}.oc-btn.green{background:#0f766e;color:#fff;border-color:#0f766e}.oc-btn.teal{background:#ccfbf1;color:#115e59;border-color:#99f6e4}.oc-btn.blue{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}.oc-btn.danger{background:#fef2f2;color:#b91c1c;border-color:#fecaca}.oc-btn.reset{height:42px}.oc-btn.full{width:100%}
.line-table{border:1px solid #e2eae7;border-radius:18px;overflow:hidden;margin-bottom:14px}.line-head,.line-row{display:grid;grid-template-columns:1.5fr .7fr .7fr .8fr .8fr .8fr;gap:8px;align-items:center;padding:11px;border-bottom:1px solid #e2eae7}.line-head{background:#f8fbfa;font-size:11px;font-weight:900;text-transform:uppercase;color:#607080}.line-row:last-child{border-bottom:0}.line-row small{display:block;color:#64748b}.editor-list{display:grid;gap:12px}.line-editor{border:1px solid #e2eae7;border-radius:18px;padding:14px;background:#fbfdfc}.line-form{display:grid;grid-template-columns:1.3fr .55fr .65fr 1fr .75fr .65fr 1fr auto;gap:10px;align-items:end}.line-editor-title{display:grid;gap:3px;align-self:center}.line-editor-title b{color:#102033}.line-editor-title small{color:#64748b}.line-actions{display:flex;gap:6px}.remove-form{margin-top:8px}.field-note{border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:14px;padding:9px 11px;margin:0;font-size:12px;line-height:1.45}.approval-note{color:#64748b;font-size:12px;font-weight:700}.split-panel{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.control-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;border:1px solid #e2eae7;border-radius:18px;padding:14px;background:#fbfdfc}.control-grid.wide{grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:12px}.span-2{grid-column:span 2}.add-line-card{align-content:start}
.metric-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-bottom:12px}.send-stack{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.send-form{display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:8px;align-items:end;border:1px solid #e2eae7;background:#fbfdfc;border-radius:18px;padding:12px}.email-send-form{grid-template-columns:minmax(200px,1fr) minmax(260px,1.3fr) auto}.send-form textarea{min-height:78px;resize:vertical}.inline-form{display:flex;gap:8px;align-items:center}.document-tray{border:1px solid #e2eae7;background:#f8fbfa;border-radius:18px;padding:12px;margin-top:14px}.document-row{background:#fff;border:1px solid #e2eae7;border-radius:16px;padding:10px;margin-top:8px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.document-row small,.document-row p{display:block;color:#64748b;margin:2px 0}.document-row p{grid-column:1/-1}.cta-row,.queue-actions,.truth-strip,.truth-list{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.truth-list span{background:#f8fbfa;border:1px solid #d8e5e1;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:800;color:#47616c}.truth-list.compact span{font-size:10px}.blocker-text,.note-text{border:1px solid #fde68a;background:#fffbeb;color:#92400e;border-radius:14px;padding:10px}
.check-form{display:grid;grid-template-columns:repeat(3,auto) minmax(220px,1fr) auto auto;gap:10px;align-items:center}.check-form label{display:flex;gap:6px;align-items:center;font-weight:800;color:#47616c}.closeout-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.closeout-form textarea{grid-column:1/-1;min-height:90px}.action-stack{position:sticky;top:16px}.next-card{border:1px solid #bfdbfe;background:#eff6ff;border-radius:18px;padding:12px;margin-bottom:12px}.stack-section{border-top:1px solid #e2eae7;padding:12px 0}.stack-section b{display:block;margin-bottom:5px;color:#102033}.stack-section ul{padding-left:18px;margin:6px 0;color:#92400e}.stack-section small{display:block;color:#64748b;margin-top:2px}.locked-card{border-style:dashed;background:#fff7ed}.empty-panel,.empty-workspace,.empty-shell{padding:24px;text-align:center}.empty-shell{max-width:760px;margin:80px auto}
.drawer-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.38);display:flex;justify-content:flex-end;z-index:50}.queue-drawer{width:min(760px,100%);height:100%;overflow:auto;background:#fff;padding:20px;box-shadow:-24px 0 60px rgba(15,23,42,.2)}.drawer-head{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #e2eae7;padding-bottom:14px}.drawer-head h3{margin:3px 0}.drawer-head p{color:#64748b;margin:0}.drawer-truth{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.event-card{border:1px solid #e2eae7;border-radius:18px;padding:14px;margin-bottom:12px}.event-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.event-card pre{max-height:340px;overflow:auto;background:#0f172a;color:#d1fae5;border-radius:14px;padding:12px;font-size:12px;line-height:1.45}
@media(max-width:1500px){.cockpit-grid{grid-template-columns:320px minmax(0,1fr)}.action-stack{grid-column:1/-1;position:static}.stage-rail{grid-template-columns:repeat(4,minmax(0,1fr))}.kpi-row{grid-template-columns:repeat(3,minmax(0,1fr))}.filter-bar{grid-template-columns:repeat(3,minmax(0,1fr))}.line-form{grid-template-columns:repeat(3,minmax(0,1fr))}.metric-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.email-send-form{grid-template-columns:1fr}.cockpit-title{grid-template-columns:1fr}.send-stack{grid-template-columns:1fr}}
@media(max-width:900px){.oc-page{padding:14px}.stage-head{display:grid}.cockpit-grid,.filter-bar,.kpi-row,.stage-rail,.split-panel,.control-grid,.control-grid.wide,.send-stack,.check-form,.closeout-form,.metric-grid,.header-metrics,.event-meta{grid-template-columns:1fr}.queue-list{max-height:none}.line-head{display:none}.line-row{grid-template-columns:1fr}.line-form{grid-template-columns:1fr}.document-row{grid-template-columns:1fr}.send-form,.inline-form,.cta-row,.queue-actions{display:grid;grid-template-columns:1fr}.span-2{grid-column:auto}}
`;
